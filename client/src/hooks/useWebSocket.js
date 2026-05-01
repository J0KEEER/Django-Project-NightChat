import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { encryptMessageSymmetric } from '../utils/crypto';

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export const useWebSocket = () => {
  const { addMessage, updatePresence, setTyping, updateMessageReaction, updateReadStatus, getConversationKey } = useChatStore();
  const ws = useRef(null);
  const heartbeatInterval = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken || !mountedRef.current) return;

    // ✅ FIX 1: Detach handlers before closing to prevent spurious reconnect
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.onerror = null;
      if (ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }
    }

    const wsUrl = `ws://localhost:8000/ws/chat/?token=${accessToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (!mountedRef.current) {
        socket.close();
        return;
      }
      console.log('WebSocket connected');
      reconnectDelay.current = INITIAL_RECONNECT_DELAY;

      heartbeatInterval.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'presence.heartbeat' }));
        }
      }, 30000);
    };

    socket.onmessage = (e) => {
      if (!mountedRef.current) return;
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

    socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code);
      if (ws.current !== socket) return;
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);

      if (mountedRef.current && event.code !== 1000) {
        // ✅ FIX 3: Calculate and store delay before setTimeout
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

        console.log(`WebSocket reconnecting in ${delay}ms...`);
        reconnectTimeout.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      }
    };

    socket.onerror = () => {
      // onclose handles reconnect
    };

    ws.current = socket;
  }, [addMessage, updatePresence, setTyping, updateMessageReaction, updateReadStatus]);

  // ✅ FIX 2: Stable effect — won't re-run when store functions change
  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (ws.current) {
        ws.current.onclose = null;
        if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.close(1000, 'Component unmounting');
        } else if (ws.current.readyState === WebSocket.CONNECTING) {
          // If connecting, wait for onopen to close it to avoid browser console warnings
        }
      }
    };
  }, []);

  const sendMessage = useCallback((conversationId, content) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const conversationKey = getConversationKey(conversationId);
      const encryptedContent = conversationKey
        ? encryptMessageSymmetric(content, conversationKey)
        : btoa(content);

      ws.current.send(JSON.stringify({
        type: 'message.send',
        conversation_id: conversationId,
        content: encryptedContent
      }));
    }
  }, [getConversationKey]);

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: isTyping ? 'typing.start' : 'typing.stop',
        conversation_id: conversationId
      }));
    }
  }, []);

  const sendReadReceipt = useCallback((conversationId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message.read',
        conversation_id: conversationId
      }));
    }
  }, []);

  const sendWebRTCSignal = useCallback((conversationId, signal) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'webrtc.signal',
        conversation_id: conversationId,
        signal
      }));
    }
  }, []);

  return { sendMessage, sendTyping, sendReadReceipt, sendWebRTCSignal };
};
