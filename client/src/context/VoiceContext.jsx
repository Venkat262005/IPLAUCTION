import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';

const VoiceContext = createContext();

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider = ({ children }) => {
    const { socket } = useSocket();
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceParticipants, setVoiceParticipants] = useState(new Set()); 
    
    // We strictly use refs for real WebRTC object management to avoid re-render cycles
    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
    };

    // Helper to cleanup a specific peer
    const removePeer = useCallback((id) => {
        if (peersRef.current.has(id)) {
            const pc = peersRef.current.get(id);
            pc.close();
            peersRef.current.delete(id);
            
            // Remove from participants list
            setVoiceParticipants(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });

            // Remove remote audio element if exists
            const audio = document.getElementById(`remote-audio-${id}`);
            if (audio) audio.remove();
            console.log(`[VOICE-CLEANUP] Peer ${id} removed`);
        }
    }, []);

    // Helper to cleanup all peers and local stream
    const cleanup = useCallback(() => {
        console.log(`[VOICE-CLEANUP] Cleaning all voice resources`);
        peersRef.current.forEach((pc, id) => {
            pc.close();
        });
        peersRef.current.clear();

        // Remove all remote audio elements
        const audios = document.querySelectorAll('audio[id^="remote-audio-"]');
        audios.forEach(a => a.remove());

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setIsJoined(false);
        setIsMuted(false);
        setVoiceParticipants(new Set());
    }, []);

    const createPeerConnection = useCallback((remoteSocketId) => {
        const pc = new RTCPeerConnection(configuration);
        peersRef.current.set(remoteSocketId, pc);

        // Add local tracks BEFORE creating offer/answer
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }
        
        // Add to participants list if not already there
        setVoiceParticipants(prev => new Set([...prev, remoteSocketId]));

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('voice-signal', {
                    to: remoteSocketId,
                    signal: { candidate: event.candidate }
                });
            }
        };

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log(`[VOICE] Received track from ${remoteSocketId}`);
            let audio = document.getElementById(`remote-audio-${remoteSocketId}`);
            if (!audio) {
                audio = document.createElement('audio');
                audio.id = `remote-audio-${remoteSocketId}`;
                audio.autoplay = true;
                // Add to DOM so it actually plays
                document.body.appendChild(audio);
            }
            audio.srcObject = event.streams[0];
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                removePeer(remoteSocketId);
            }
        };

        return pc;
    }, [socket, removePeer]);

    const joinVoice = useCallback(async (roomCode) => {
        if (!socket || isJoined) return;

        try {
            console.log(`[VOICE] Requesting microphone access for room ${roomCode}...`);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setIsJoined(true);
            setIsMuted(false);

            socket.emit('voice-join', { roomCode });
            console.log(`[VOICE] Successfully joined voice session`);
        } catch (err) {
            console.error(`[VOICE] Microphone access denied or failed:`, err);
            alert("Microphone access is required for voice chat. Please allow permissions in your browser.");
        }
    }, [socket, isJoined]);

    const leaveVoice = useCallback((roomCode) => {
        if (!socket) return;
        console.log(`[VOICE] Leaving voice room ${roomCode}`);
        socket.emit('voice-leave', { roomCode });
        cleanup();
    }, [socket, cleanup]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const newMuted = !isMuted;
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !newMuted;
            });
            setIsMuted(newMuted);
            console.log(`[VOICE] Local mic ${newMuted ? 'MUTED' : 'UNMUTED'}`);
        }
    }, [isMuted]);

    useEffect(() => {
        if (!socket) return;

        // Existing users in voice will receive this when a NEW user joins
        const handleUserJoined = async ({ socketId }) => {
            console.log(`[VOICE-SIGNAL] User ${socketId} arrived. Sending offer...`);
            const pc = createPeerConnection(socketId);
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                socket.emit('voice-signal', {
                    to: socketId,
                    signal: { sdp: pc.localDescription }
                });
            } catch (err) {
                console.error(`[VOICE-SIGNAL] Failed to create offer for ${socketId}:`, err);
            }
        };

        // Receiving signaling data from a peer
        const handleSignal = async ({ from, signal }) => {
            let pc = peersRef.current.get(from);

            if (signal.sdp) {
                if (signal.sdp.type === 'offer') {
                    console.log(`[VOICE-SIGNAL] Received offer from ${from}. Sending answer...`);
                    if (!pc) pc = createPeerConnection(from);
                    
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('voice-signal', {
                            to: from,
                            signal: { sdp: pc.localDescription }
                        });
                    } catch (err) {
                        console.error(`[VOICE-SIGNAL] Failed to respond to offer from ${from}:`, err);
                    }
                } else if (signal.sdp.type === 'answer') {
                    console.log(`[VOICE-SIGNAL] Received answer from ${from}`);
                    if (pc) {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                        } catch (err) {
                            console.error(`[VOICE-SIGNAL] Failed to set remote answer from ${from}:`, err);
                        }
                    }
                }
            } else if (signal.candidate) {
                if (pc) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    } catch (err) {
                        console.warn(`[VOICE-SIGNAL] Failed to add ICE candidate from ${from}:`, err);
                    }
                }
            }
        };

        const handleUserLeft = ({ socketId }) => {
            removePeer(socketId);
        };

        socket.on('voice-user-joined', handleUserJoined);
        socket.on('voice-signal', handleSignal);
        socket.on('voice-user-left', handleUserLeft);

        return () => {
            socket.off('voice-user-joined', handleUserJoined);
            socket.off('voice-signal', handleSignal);
            socket.off('voice-user-left', handleUserLeft);
            // We DON'T cleanup tracks here because the component might unmount/remount 
            // while the auction is still active. Explicit leaveVoice call handles cleanup.
        };
    }, [socket, createPeerConnection, removePeer]);

    return (
        <VoiceContext.Provider value={{
            isJoined,
            isMuted,
            joinVoice,
            leaveVoice,
            toggleMute,
            voiceParticipants
        }}>
            {children}
        </VoiceContext.Provider>
    );
};
