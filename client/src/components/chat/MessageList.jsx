import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chat';
import { useAuthStore } from '../../store/auth';
import { Smile, FileText, Check, CheckCheck, ChevronDown } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { EncryptedAttachment } from './EncryptedAttachment';
import { VoicePlayer } from './VoicePlayer';

export const MessageList = ({ conversationId }) => {
  const { messages, fetchMessages, typing, toggleReaction, searchQuery, conversations } = useChatStore();
  const { user } = useAuthStore();
  const [atBottom, setAtBottom] = useState(true);
  const virtuosoRef = useRef(null);

  useEffect(() => {
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  const conversation = conversations.find(c => c.id === conversationId);
  const otherParticipants = conversation?.participants?.filter(p => p.user !== user?.id) || [];
  
  const conversationMessages = (messages[conversationId] || []).filter(msg => {
    if (!searchQuery) return true;
    const content = msg.content?.toLowerCase() || '';
    const filename = msg.attachment_name?.toLowerCase() || '';
    return content.includes(searchQuery.toLowerCase()) || filename.includes(searchQuery.toLowerCase());
  });
  
  const activeTyping = (typing[conversationId] || []).filter(u => u !== user?.username);

  const getMessageStatus = (msg) => {
    if (msg.sender !== user?.id) return null;
    
    // Check if ALL other participants have read this message
    const isReadByAll = otherParticipants.length > 0 && otherParticipants.every(p => {
      return new Date(p.last_read_at) >= new Date(msg.created_at);
    });

    if (isReadByAll) return <CheckCheck size={14} className="text-blue-500" />;
    return <Check size={14} className="text-gray-400 dark:text-gray-500" />;
  };

  return (
    <div className="h-full relative">
      <Virtuoso
        ref={virtuosoRef}
        data={conversationMessages}
        initialTopMostItemIndex={conversationMessages.length - 1}
        followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
        atBottomStateChange={setAtBottom}
        className="h-full"
        itemContent={(index, msg) => {
          const isMe = msg.sender === user?.id;
          const showAvatar = index === 0 || conversationMessages[index-1]?.sender !== msg.sender;
          
          return (
            <div className={`flex flex-col mb-6 px-6 ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-3 max-w-[85%] group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="shrink-0 mb-1">
                  {!isMe && showAvatar ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-200 shadow-sm border border-white dark:border-gray-700">
                      {msg.sender_details?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className={`px-5 py-3 shadow-sm relative group/bubble ${
                    isMe 
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white rounded-2xl rounded-br-none border border-black/5 dark:border-white/10' 
                      : 'bg-black dark:bg-indigo-600 text-white rounded-2xl rounded-bl-none'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content_decrypted || msg.content}</p>
                    
                    {msg.attachment && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                        {msg.message_type === 'VOICE_MESSAGE' ? (
                          <VoicePlayer msg={msg} isMe={isMe} />
                        ) : (
                          <EncryptedAttachment msg={msg} isMe={isMe} />
                        )}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => toggleReaction(msg.id, '❤️')}
                      className={`absolute top-1/2 -translate-y-1/2 p-1.5 glass rounded-full opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 ${
                        isMe ? '-left-10' : '-right-10'
                      }`}
                    >
                      <Smile size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  
                  {msg.reactions?.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => toggleReaction(msg.id, r.emoji)}
                          className="bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-black/5 dark:border-white/10 px-2 py-0.5 rounded-full text-[10px] hover:bg-white dark:hover:bg-white/20 transition-colors shadow-sm flex items-center gap-1"
                        >
                          <span>{r.emoji}</span>
                          <span className="font-bold opacity-60">{r.count || 1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'mr-11' : 'ml-11'}`}>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && getMessageStatus(msg)}
              </div>
            </div>
          );
        }}
        components={{
          Footer: () => (
            <>
              {activeTyping.length > 0 && (
                <div className="flex items-center gap-3 ml-11 mb-6">
                  <div className="bg-black dark:bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-bl-none flex gap-1.5 items-center shadow-md">
                    <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-duration:0.8s]" />
                    <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                    Typing...
                  </span>
                </div>
              )}
              <div className="h-6" />
            </>
          )
        }}
      />

      {!atBottom && (
        <button 
          onClick={() => virtuosoRef.current.scrollToIndex({ index: conversationMessages.length - 1, behavior: 'smooth' })}
          className="absolute bottom-4 right-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white dark:border-gray-700 p-2 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all transform hover:scale-110 active:scale-95"
        >
          <ChevronDown size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
      )}
    </div>
  );
};
