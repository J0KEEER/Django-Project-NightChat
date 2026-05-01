import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { decryptFile } from '../../utils/crypto';
import { useChatStore } from '../../store/chat';

export const EncryptedAttachment = ({ msg, isMe }) => {
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getConversationKey } = useChatStore();

  const isImage = msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  useEffect(() => {
    if (isImage) {
      handleDecrypt();
    }
    return () => {
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
    };
  }, [msg.attachment]);

  const handleDecrypt = async () => {
    setIsLoading(true);
    try {
      const conversationKey = getConversationKey(msg.conversation);
      if (!conversationKey) throw new Error("No conversation key found");

      const response = await fetch(msg.attachment);
      const encryptedBlob = await response.blob();
      
      const decryptedBlob = await decryptFile(encryptedBlob, conversationKey);
      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrl(url);
    } catch (err) {
      console.error("Failed to decrypt file", err);
      setError("Decryption failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-black/5 dark:bg-white/5 rounded-xl">
        <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
        <FileText size={16} />
        {error}
      </div>
    );
  }

  if (isImage && decryptedUrl) {
    return (
      <img 
        src={decryptedUrl} 
        alt={msg.attachment_name || "Attachment"} 
        className="max-w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-300 cursor-zoom-in rounded-xl"
      />
    );
  }

  return (
    <div 
      onClick={!decryptedUrl ? handleDecrypt : undefined}
      className="flex items-center gap-3 p-3 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
    >
      <div className={`p-2 rounded-lg ${isMe ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-gray-700 text-black dark:text-white'}`}>
        <FileText size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold truncate">{msg.attachment_name || 'File Attachment'}</p>
        <p className="text-[9px] opacity-60">
          {decryptedUrl ? (
            <a href={decryptedUrl} download={msg.attachment_name} className="text-blue-500 hover:underline">
              Download Decrypted
            </a>
          ) : 'Click to decrypt and download'}
        </p>
      </div>
      {decryptedUrl && <Download size={16} className="text-gray-400 dark:text-gray-500" />}
    </div>
  );
};
