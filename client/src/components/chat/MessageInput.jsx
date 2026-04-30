import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';

export const MessageInput = ({ onSend, onTyping, onFile }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
    
    // Stop typing immediately on send
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onFile) {
      onFile(file);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        if (onFile) onFile(file, 'VOICE_MESSAGE');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/40 p-2 pl-4 rounded-3xl shadow-lg shadow-black/5 group focus-within:bg-white transition-all duration-300">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      {isRecording ? (
        <div className="flex-1 flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono text-gray-600">{formatTime(recordingTime)}</span>
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 animate-shimmer" style={{ width: '100%' }} />
          </div>
          <button 
            type="button" 
            onClick={stopRecording}
            className="text-xs font-bold text-red-500 hover:text-red-600 px-2"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip size={20} />
          </button>
          
          <input
            type="text"
            value={message}
            onChange={handleChange}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 py-2"
          />
        </>
      )}
      
      <div className="flex items-center gap-1 pr-1">
        {!isRecording && (
          <button type="button" className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
            <Smile size={20} />
          </button>
        )}
        
        <button 
          type="button" 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Mic size={20} />
        </button>
        
        {!isRecording && (
          <button 
            type="submit" 
            disabled={!message.trim()}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
              message.trim() 
                ? 'bg-black text-white shadow-md transform scale-105 active:scale-95' 
                : 'bg-gray-100 text-gray-300'
            }`}
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </form>
  );
};
