import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { encryptMessageSymmetric } from '../utils/crypto';

export const useWebSocket = () => {
  const { addMessage, updatePresence, setTyping, updateMessageReaction, updateReadStatus, getConversationKey } = useChatStore();
  const ws = useRef(null);
  const heartbeatInterval = useRef(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    const wsUrl = `ws://localhost:8000/ws/chat/?token=${accessToken}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      // Start heartbeat
      heartbeatInterval.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'presence.heartbeat' }));
        }
      }, 30000);
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case 'message.receive':
          addMessage(data);
          break;
        case 'presence.update':
          updatePresence(data.user_id, data.status);
          break;
        case 'typing.start':
          setTyping(data.conversation_id, data.user_id, true);
          break;
        case 'typing.stop':
          setTyping(data.conversation_id, data.user_id, false);
          break;
        case 'reaction.update':
          updateMessageReaction(data.message_id, data.conversation_id, data.user_id, data.emoji, data.action);
          break;
        case 'message.read':
          updateReadStatus(data.conversation_id, data.user_id, data.read_at);
          break;
        case 'webrtc.signal':
          window.dispatchEvent(new CustomEvent('webrtc-signal', { detail: data }));
          break;
        default:
          break;
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };

    return () => {
      if (ws.current) ws.current.close();
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, [addMessage, updatePresence, setTyping, updateMessageReaction, updateReadStatus]);

  const sendMessage = (conversationId, content) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const conversationKey = getConversationKey(conversationId);
      const encryptedContent = conversationKey 
        ? encryptMessageSymmetric(content, conversationKey)
        : btoa(content); // Fallback for unencrypted convos

      ws.current.send(JSON.stringify({
        type: 'message.send',
        conversation_id: conversationId,
        content: encryptedContent
      }));
    }
  };

  const sendTyping = (conversationId, isTyping) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: isTyping ? 'typing.start' : 'typing.stop',
        conversation_id: conversationId
      }));
    }
  };

  const sendReadReceipt = (conversationId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message.read',
        conversation_id: conversationId
      }));
    }
  };

  const sendWebRTCSignal = (conversationId, signal) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'webrtc.signal',
        conversation_id: conversationId,
        signal
      }));
    }
  };

  return { sendMessage, sendTyping, sendReadReceipt, sendWebRTCSignal };
};
