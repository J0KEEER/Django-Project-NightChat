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
    <div className="flex flex-col h-full bg-white/40 dark:bg-white/5 backdrop-blur-md">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronDown size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                isActive 
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl shadow-black/10 dark:shadow-white/5' 
                  : 'hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${
                  isActive 
                    ? 'bg-white/20 dark:bg-black/20' 
                    : 'bg-gradient-to-tr from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {convo.is_group ? 'G' : otherParticipant?.user_details?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {isOnline && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                    isActive ? 'bg-green-400 border-black dark:border-white' : 'bg-green-500 border-white dark:border-gray-800'
                  }`} />
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className={`font-bold text-sm truncate ${isActive ? 'text-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>
                    {convo.is_group ? convo.name : (otherParticipant?.user_details?.username || 'User')}
                  </h3>
                  <span className={`text-[10px] whitespace-nowrap ml-2 ${isActive ? 'text-white/60 dark:text-black/50' : 'text-gray-400 dark:text-gray-500'}`}>
                    10:45 AM
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate ${isActive ? 'text-white/70 dark:text-black/60' : 'text-gray-500 dark:text-gray-400'}`}>
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

      <div className="p-4 border-t border-black/5 dark:border-white/5">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
