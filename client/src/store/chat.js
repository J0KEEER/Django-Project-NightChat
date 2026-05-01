import { create } from 'zustand';
import api from '../api/client';
import { 
  decryptMessage, 
  encryptMessage, 
  encryptFile, 
  decryptFile, 
  generateRandomKey,
  encryptMessageSymmetric,
  decryptMessageSymmetric
} from '../utils/crypto';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {}, // { conversationId: [msg1, msg2] }
  presence: {}, // { userId: 'online' | 'offline' }
  typing: {}, // { conversationId: [userId1, userId2] }
  searchQuery: '',
  isLoading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  // Helper to get decrypted conversation key
  getConversationKey: (conversationId) => {
    const conversation = get().conversations.find(c => c.id === conversationId);
    if (!conversation) return null;

    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const myUserId = JSON.parse(atob(token.split('.')[1])).user_id;
    const myParticipant = conversation.participants.find(p => p.user === myUserId);
    
    if (!myParticipant || !myParticipant.encrypted_conversation_key) return null;
    
    const myPrivKey = localStorage.getItem('private_key');
    if (!myPrivKey || !myParticipant.key_sender_public_key) return null;

    // The key was encrypted using tweetnacl.box (asymmetric)
    return decryptMessage(myParticipant.encrypted_conversation_key, myParticipant.key_sender_public_key, myPrivKey);
  },

  createConversation: async (members, name = null, isGroup = false) => {
    const sharedSecret = generateRandomKey();
    const myPrivKey = localStorage.getItem('private_key');
    const myPubKey = localStorage.getItem('public_key');
    
    const encrypted_keys = {};
    const myUserId = JSON.parse(atob(localStorage.getItem('access_token').split('.')[1])).user_id;
    
    // Encrypt for self
    const { ciphertext: selfKey } = encryptMessage(sharedSecret, myPubKey, myPrivKey);
    encrypted_keys[myUserId] = selfKey;

    members.forEach(member => {
      if (member.public_key) {
        const { ciphertext } = encryptMessage(sharedSecret, member.public_key, myPrivKey);
        encrypted_keys[member.id] = ciphertext;
      }
    });

    try {
      const response = await api.post('/api/chat/conversations/', {
        members: members.map(m => m.id),
        name,
        is_group: isGroup,
        encrypted_keys,
        creator_public_key: myPubKey
      });
      set(state => ({ conversations: [response.data, ...state.conversations] }));
      return response.data;
    } catch (err) {
      console.error("Failed to create conversation", err);
      throw err;
    }
  },

  uploadFile: async (conversationId, file, type = 'FILE_ATTACHMENT') => {
    const conversationKey = get().getConversationKey(conversationId);
    
    let fileToUpload = file;
    if (conversationKey) {
      fileToUpload = await encryptFile(file, conversationKey);
    }

    const formData = new FormData();
    formData.append('attachment', fileToUpload);
    formData.append('attachment_name', file.name);
    
    // For encrypted files, we send a placeholder as content
    const placeholder = type === 'VOICE_MESSAGE' ? '[Voice Message]' : `[File: ${file.name}]`;
    const encryptedContent = conversationKey 
      ? encryptMessageSymmetric(placeholder, conversationKey)
      : btoa(placeholder);

    formData.append('content', encryptedContent); 
    formData.append('message_type', type);
    try {
      const response = await api.post(`/api/chat/conversations/${conversationId}/send_message/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (err) {
      console.error("Upload failed", err);
      throw err;
    }
  },

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/api/chat/conversations/');
      set({ conversations: response.data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    try {
      const response = await api.get(`/api/chat/conversations/${conversationId}/messages/`);
      const rawMessages = response.data.results.reverse();
      const conversationKey = get().getConversationKey(conversationId);
      
      const messages = rawMessages.map(msg => {
        if (conversationKey) {
          const decrypted = decryptMessageSymmetric(msg.content, conversationKey);
          return { ...msg, content_decrypted: decrypted };
        }
        return msg;
      });

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messages
        }
      }));
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  },

  addMessage: (message) => {
    const { conversation } = message;
    const conversationKey = get().getConversationKey(conversation);
    
    let decryptedMessage = message;
    if (conversationKey) {
      const decrypted = decryptMessageSymmetric(message.content, conversationKey);
      decryptedMessage = { ...message, content_decrypted: decrypted };
    }
    
    set((state) => {
      const convMessages = state.messages[conversation] || [];
      if (convMessages.find(m => m.id === message.id)) return state;
      
      const newConversations = state.conversations.map(c => {
        if (c.id === conversation && conversation !== state.activeConversationId) {
          return { ...c, unread_count: (c.unread_count || 0) + 1 };
        }
        return c;
      });

      return {
        conversations: newConversations,
        messages: {
          ...state.messages,
          [conversation]: [...convMessages, decryptedMessage]
        }
      };
    });
  },

  updatePresence: (userId, status) => {
    set((state) => ({
      presence: { ...state.presence, [userId]: status }
    }));
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const currentTyping = state.typing[conversationId] || [];
      const newTyping = isTyping 
        ? [...new Set([...currentTyping, userId])]
        : currentTyping.filter(id => id !== userId);
      
      return {
        typing: { ...state.typing, [conversationId]: newTyping }
      };
    });
  },

  updateMessageReaction: (messageId, conversationId, userId, emoji, action) => {
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      const updatedMessages = convMessages.map(msg => {
        if (msg.id === messageId) {
          let reactions = msg.reactions || [];
          if (action === 'added') {
            reactions = [...reactions, { user: userId, emoji }];
          } else {
            reactions = reactions.filter(r => !(r.user === userId && r.emoji === emoji));
          }
          return { ...msg, reactions };
        }
        return msg;
      });
      return {
        messages: { ...state.messages, [conversationId]: updatedMessages }
      };
    });
  },

  updateReadStatus: (conversationId, userId, readAt) => {
    set((state) => ({
      conversations: state.conversations.map(c => {
        if (c.id === conversationId) {
          return {
            ...c,
            participants: c.participants.map(p => 
              p.user === userId ? { ...p, last_read_at: readAt } : p
            )
          };
        }
        return c;
      })
    }));
  },

  markAsRead: async (conversationId) => {
    try {
      await api.post(`/api/chat/conversations/${conversationId}/mark_as_read/`);
      set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      }));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
       get().fetchMessages(id);
       get().markAsRead(id);
    }
  }
}));
