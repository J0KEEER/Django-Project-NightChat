import { useEffect, useState } from 'react';
import { useChatStore } from '../../store/chat';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { EmptyState } from './EmptyState';
import { ContactsPage } from './ContactsPage';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { Home, Plus, Calendar, MessageSquare, Briefcase, Settings, LogOut, Pin, Image as ImageIcon, FileText, Phone, X, PhoneIncoming, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

export const ChatLayout = () => {
  const { fetchConversations, activeConversationId, conversations, presence, uploadFile } = useChatStore();
  const { sendMessage, sendTyping, sendReadReceipt } = useWebSocket();
  const { callState, startCall, answerCall, endCall, remoteStream } = useWebRTC(activeConversationId);
  const { logout, user } = useAuthStore();
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      sendReadReceipt(activeConversationId);
    }
  }, [activeConversationId, sendReadReceipt]);

  const activeConvo = conversations.find(c => c.id === activeConversationId);
  const otherParticipant = activeConvo?.participants?.find(p => p.user !== user?.id);
  const isOnline = presence[otherParticipant?.user] === 'online';

  return (
    <div className="flex h-screen w-full p-4 gap-4 overflow-hidden animate-in fade-in duration-500">
      {/* 1. Leftmost Vertical Navigation */}
      <div className="w-16 flex flex-col items-center py-6 gap-6 glass rounded-3xl shrink-0">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-4">
          <div className="grid grid-cols-2 gap-0.5">
            {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />)}
          </div>
        </div>
        <div className="flex flex-col gap-6 items-center">
          <button className="text-gray-400 hover:text-black transition-colors"><Home size={22} /></button>
          <button className="text-black transition-colors relative">
            <MessageSquare size={22} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setShowContacts(true)}
            className={`transition-colors ${showContacts ? 'text-black' : 'text-gray-400 hover:text-black'}`}
          >
            <Users size={22} />
          </button>
          <button className="text-gray-400 hover:text-black transition-colors"><Calendar size={22} /></button>
          <button className="text-gray-400 hover:text-black transition-colors"><Briefcase size={22} /></button>
        </div>
        
        <div className="mt-auto flex flex-col gap-6">
          <button className="btn-circle hover:bg-white/50 text-gray-500"><Settings size={20} /></button>
          <button onClick={logout} className="btn-circle hover:bg-red-50 text-gray-500 hover:text-red-500"><LogOut size={20} /></button>
        </div>
      </div>

      {/* 2. Messages Sidebar */}
      <div className="w-96 glass rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
        {showContacts ? <ContactsPage onBack={() => setShowContacts(false)} /> : <Sidebar />}
      </div>

      {/* 3. Main Chat Area */}
      <div className="flex-1 glass rounded-3xl flex flex-col overflow-hidden relative transition-all duration-500">
        {activeConversationId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/20 flex justify-between items-center bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                    {activeConvo?.is_group ? 'G' : otherParticipant?.user_details?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">
                    {activeConvo?.is_group ? activeConvo.name : (otherParticipant?.user_details?.username || 'Alexander Jameson')}
                  </h2>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <button 
                  onClick={startCall}
                  className={`p-2 rounded-full transition-colors ${callState === 'connected' ? 'bg-green-100 text-green-600' : 'hover:text-gray-900 hover:bg-black/5'}`}
                >
                  <Phone size={18} />
                </button>
                <button className="hover:text-gray-900 transition-colors p-2"><Pin size={18} /></button>
                <button className="hover:text-gray-900 transition-colors p-2"><ImageIcon size={18} /></button>
                <button className="hover:text-gray-900 transition-colors p-2"><FileText size={18} /></button>
              </div>
            </div>

            {/* Call Overlay */}
            {callState !== 'idle' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="glass p-8 rounded-3xl flex flex-col items-center gap-6 w-80 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-400 to-blue-400 flex items-center justify-center text-white text-2xl font-bold animate-pulse">
                    {otherParticipant?.user_details?.username?.[0]?.toUpperCase()}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{otherParticipant?.user_details?.username}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {callState === 'calling' && 'Calling...'}
                      {callState === 'incoming' && 'Incoming Call'}
                      {callState === 'connected' && 'In Call'}
                    </p>
                  </div>

                  <div className="flex gap-6 mt-4">
                    {callState === 'incoming' ? (
                      <>
                        <button 
                          onClick={answerCall}
                          className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 hover:scale-110 transition-transform"
                        >
                          <Phone size={24} />
                        </button>
                        <button 
                          onClick={endCall}
                          className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 transition-transform"
                        >
                          <X size={24} />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={endCall}
                        className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 transition-transform"
                      >
                        <X size={24} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Remote Audio */}
            {remoteStream && (
              <audio 
                ref={(el) => { if (el) el.srcObject = remoteStream }} 
                autoPlay 
                className="hidden" 
              />
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-hidden">
              <MessageList conversationId={activeConversationId} />
            </div>

            {/* Input Bar */}
            <div className="p-4 mt-auto">
              <MessageInput 
                onSend={(content) => sendMessage(activeConversationId, content)} 
                onTyping={(isTyping) => sendTyping(activeConversationId, isTyping)}
                onFile={(file, type) => uploadFile(activeConversationId, file, type)}
              />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};
