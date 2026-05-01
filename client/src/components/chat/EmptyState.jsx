import { MessageSquare, ShieldCheck } from 'lucide-react';

export const EmptyState = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 rounded-full bg-white/40 dark:bg-white/5 glass flex items-center justify-center mb-8 relative">
        <MessageSquare size={40} className="text-gray-400 dark:text-gray-500" />
        <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
          <ShieldCheck size={12} className="text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Your Messages</h3>
      <p className="max-w-xs text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
        Select a conversation from the sidebar to start chatting. Your connection is secured with end-to-end encryption.
      </p>
    </div>
  );
};
