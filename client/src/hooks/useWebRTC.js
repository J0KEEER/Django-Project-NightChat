import { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export const useWebRTC = (conversationId) => {
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const peerConnection = useRef(null);
  const { sendWebRTCSignal } = useWebSocket();

  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState('idle');
  }, [localStream]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebRTCSignal(conversationId, { type: 'candidate', candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') cleanup();
    };

    peerConnection.current = pc;
    return pc;
  }, [conversationId, sendWebRTCSignal, cleanup]);

  const startCall = async () => {
    setCallState('calling');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setLocalStream(stream);

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendWebRTCSignal(conversationId, { type: 'offer', sdp: offer.sdp });
  };

  const handleOffer = async (sdp) => {
    setCallState('incoming');
    // For now, we auto-accept or wait for user action. 
    // In a real app, this triggers an "Incoming Call" UI.
  };

  const answerCall = async (offerSdp) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setLocalStream(stream);

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendWebRTCSignal(conversationId, { type: 'answer', sdp: answer.sdp });
    setCallState('connected');
  };

  const handleAnswer = async (sdp) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    }
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection.current) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const { conversation_id, signal } = e.detail;
      if (conversation_id !== conversationId) return;

      if (signal.type === 'offer') handleOffer(signal.sdp);
      if (signal.type === 'answer') handleAnswer(signal.sdp);
      if (signal.type === 'candidate') handleCandidate(signal.candidate);
    };

    window.addEventListener('webrtc-signal', handler);
    return () => window.removeEventListener('webrtc-signal', handler);
  }, [conversationId]);

  return { 
    callState, 
    localStream, 
    remoteStream, 
    startCall, 
    answerCall, 
    endCall: cleanup 
  };
};
