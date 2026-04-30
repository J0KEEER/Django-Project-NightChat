import React, { useState } from 'react';
import { useChatStore } from '../../store/chat';
import { useAuthStore } from '../../store/auth';
import { Search, ChevronDown, LogOut } from 'lucide-react';

export const Sidebar = () => {
  const { conversations, activeConversationId, setActiveConversation, presence, searchQuery, setSearchQuery } = useChatStore();
  const { user, logout } = useAuthStore();

  const filteredConversations = conversations.filter(c => {
    if (c.is_group) return c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const other = c.participants?.find(p => p.user !== user?.id);
    return other?.user_details?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button className="text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronDown size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 border border-white/20 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {filteredConversations.map((convo) => {
          const otherParticipant = convo.participants?.find(p => p.user !== user?.id);
          const isOnline = presence[otherParticipant?.user] === 'online';
          const unread = convo.unread_count || 0;
          const isActive = activeConversationId === convo.id;

          return (
            <button
              key={convo.id}
              onClick={() => setActiveConversation(convo.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${
                isActive ? 'bg-black text-white shadow-xl shadow-black/10' : 'hover:bg-white/60'
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${
                  isActive ? 'bg-white/20' : 'bg-gradient-to-tr from-gray-100 to-gray-200 text-gray-600'
                }`}>
                  {convo.is_group ? 'G' : otherParticipant?.user_details?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {isOnline && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                    isActive ? 'bg-green-400 border-black' : 'bg-green-500 border-white'
                  }`} />
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {convo.is_group ? convo.name : (otherParticipant?.user_details?.username || 'User')}
                  </h3>
                  <span className={`text-[10px] whitespace-nowrap ml-2 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                    10:45 AM
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                    {convo.last_message?.content || 'No messages yet...'}
                  </p>
                  {unread > 0 && !isActive && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shadow-sm">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-black/5">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
