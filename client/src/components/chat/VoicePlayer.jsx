import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { decryptFile } from '../../utils/crypto';
import { useChatStore } from '../../store/chat';

export const VoicePlayer = ({ msg, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef(null);
  const { getConversationKey } = useChatStore();

  useEffect(() => {
    return () => {
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
    };
  }, [decryptedUrl]);

  const handleTogglePlay = async () => {
    if (!decryptedUrl) {
      await handleDecrypt();
    } else {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleDecrypt = async () => {
    setIsLoading(true);
    try {
      const conversationKey = getConversationKey(msg.conversation);
      if (!conversationKey) throw new Error("No conversation key");

      const response = await fetch(msg.attachment);
      const encryptedBlob = await response.blob();
      
      const decryptedBlob = await decryptFile(encryptedBlob, conversationKey);
      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrl(url);
      
      // Start playing after decryption
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Failed to decrypt voice message", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2 min-w-[200px] ${isMe ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      <button 
        onClick={handleTogglePlay}
        disabled={isLoading}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
        }`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-1" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="relative h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-100 ${
              isMe ? 'bg-white' : 'bg-black dark:bg-white'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[9px] font-mono opacity-60">
            {formatTime(audioRef.current?.currentTime || 0)}
          </span>
          <span className="text-[9px] font-mono opacity-60">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <Volume2 size={14} className="opacity-40" />

      {decryptedUrl && (
        <audio 
          ref={audioRef}
          src={decryptedUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
          }}
          className="hidden"
        />
      )}
    </div>
  );
};
