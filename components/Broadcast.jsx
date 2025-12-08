import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectAdmin, selectIsAuthenticated } from '@/store/slices/adminSlice';
import { Phone, PhoneOff, Radio, Mic, MicOff, Users, ExternalLink } from 'lucide-react';
import io from 'socket.io-client';

export default function Broadcast() {
    const router = useRouter();
    const authenticated = useSelector(selectIsAuthenticated);
    const admin = useSelector(selectAdmin);

    const [admins, setAdmins] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    // Call state
    const [activeCall, setActiveCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callStatus, setCallStatus] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [currentCallType, setCurrentCallType] = useState(null);

    // WebRTC refs
    const remoteAudioRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const iceCandidateBuffer = useRef([]);

    // Initialize socket connection
    useEffect(() => {
        if (authenticated && admin) {
            const newSocket = io('http://localhost:5000');
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Connected to signaling server');
                newSocket.emit('register', {
                    email: admin.email,
                    sectionId: admin.sectionId
                });
            });

            newSocket.on('users-online', (users) => {
                setOnlineUsers(users.filter(u => u.email !== admin.email));
            });

            newSocket.on('incoming-call', handleIncomingCall);
            newSocket.on('call-accepted', handleCallAccepted);
            newSocket.on('ice-candidate', handleIceCandidate);
            newSocket.on('call-ended', handleCallEnded);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [authenticated, admin]);

    // Monitor remote stream
    useEffect(() => {
        if (remoteAudioRef.current && peerConnection.current) {
            const pc = peerConnection.current;
            const receivers = pc.getReceivers();
            receivers.forEach(receiver => {
                if (receiver.track && receiver.track.kind === 'audio') {
                    const stream = new MediaStream([receiver.track]);
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch(e => console.log('Play error:', e.message));
                }
            });
        }
    }, [callStatus, activeCall]);

    // Fetch admins list
    useEffect(() => {
        if (authenticated) {
            fetchAdmins();
        }
    }, [authenticated]);

    const fetchAdmins = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/broadcast/admins`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAdmins(data.data.filter(a => a.email !== admin?.email));
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    // Initialize peer connection
    const createPeerConnection = () => {
        const pc = new RTCPeerConnection();
        pc._targetEmail = null;

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && pc._targetEmail) {
                socket.emit('ice-candidate', { to: pc._targetEmail, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream;
                remoteAudioRef.current.play().catch(e => console.log('Auto-play blocked:', e.message));
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setCallStatus('connected');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            }
        };

        return pc;
    };

    // Start call
    const startCall = async (targetAdmin) => {
        try {
            setActiveCall(targetAdmin);
            setCurrentCallType('outgoing');
            setCallStatus('calling');
            iceCandidateBuffer.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
            });

            localStream.current = stream;
            peerConnection.current = createPeerConnection();
            peerConnection.current._targetEmail = targetAdmin.email;

            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            const offer = await peerConnection.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await peerConnection.current.setLocalDescription(offer);

            socket.emit('call-user', {
                from: admin.email,
                to: targetAdmin.email,
                offer: offer,
                callType: 'audio'
            });
        } catch (error) {
            console.error('Error starting call:', error);
            alert('Could not start call. Please check microphone permissions.');
            setActiveCall(null);
            setCallStatus('');
        }
    };

    // Handle incoming call
    const handleIncomingCall = async (data) => {
        setIncomingCall({ from: data.from, offer: data.offer, callType: data.callType });
        setCallStatus('ringing');
    };

    // Accept call
    const acceptCall = async () => {
        try {
            const callerEmail = incomingCall.from;
            iceCandidateBuffer.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
            });

            localStream.current = stream;
            peerConnection.current = createPeerConnection();
            peerConnection.current._targetEmail = callerEmail;

            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });

            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

            for (const candidate of iceCandidateBuffer.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateBuffer.current = [];

            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            socket.emit('call-accepted', { to: callerEmail, from: admin.email, answer: answer });

            setActiveCall({ email: callerEmail });
            setIncomingCall(null);
            setCallStatus('connected');
            setCurrentCallType('incoming');
        } catch (error) {
            console.error('Error accepting call:', error);
            rejectCall();
        }
    };

    // Reject call
    const rejectCall = () => {
        if (incomingCall) {
            socket.emit('end-call', { to: incomingCall.from });
        }
        setIncomingCall(null);
        setCallStatus('');
    };

    // Handle call accepted
    const handleCallAccepted = async (data) => {
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            for (const candidate of iceCandidateBuffer.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateBuffer.current = [];
            setCallStatus('connected');
        } catch (error) {
            console.error('Error handling call accepted:', error);
        }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data) => {
        try {
            if (peerConnection.current && peerConnection.current.remoteDescription) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                iceCandidateBuffer.current.push(data.candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    };

    // End call
    const endCall = () => {
        if (activeCall) {
            socket?.emit('end-call', { to: activeCall.email });
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
        }
        if (peerConnection.current) {
            peerConnection.current.close();
        }
        localStream.current = null;
        peerConnection.current = null;
        setActiveCall(null);
        setCallStatus('');
        setIsMuted(false);
        setCurrentCallType(null);
    };

    const handleCallEnded = () => endCall();

    // Toggle mute
    const toggleMute = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const handleOpenFullPage = () => router.push('/broadcast');

    return (
        <div
            className="glass-dark rounded-xl p-4 h-full border animate-slide-in flex flex-col"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-glass)' }}
        >
            {/* Incoming Call Modal */}
            {incomingCall && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="glass-dark p-6 rounded-2xl max-w-sm w-full mx-4">
                        <div className="text-center mb-4">
                            <Phone size={48} className="text-green-500 mx-auto mb-3 animate-pulse" />
                            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Incoming Call</h2>
                            <p className="text-gray-300 text-sm">{incomingCall.from}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={acceptCall} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all">Accept</button>
                            <button onClick={rejectCall} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all">Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #EA7317 0%, #FF9933 100%)' }}>
                        <Radio size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Communication</h2>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{onlineUsers.length} online</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenFullPage}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                    title="Open Full Page"
                >
                    <ExternalLink size={16} style={{ color: 'var(--text-tertiary)' }} />
                </button>
            </div>

            {/* Active Call UI */}
            {activeCall ? (
                <div className="flex-1 flex flex-col">
                    <div className="glass-orange p-4 rounded-xl flex-1 flex flex-col justify-center">
                        <div className="text-center mb-3">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Phone size={24} className="text-green-400" />
                            </div>
                            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{activeCall.email}</h3>
                            <div className="flex items-center justify-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full live-pulse"></div>
                                <span className="text-xs text-green-300">{callStatus === 'connected' ? 'Connected' : 'Connecting...'}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={toggleMute} className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
                                {isMuted ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
                            </button>
                            <button onClick={endCall} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all flex items-center gap-2">
                                <PhoneOff size={18} />
                                <span className="text-sm">End</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Admins List - 2 columns grid */
                <div className="flex-1 overflow-auto">
                    {admins.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {admins.slice(0, 6).map((adminItem) => {
                                const isOnline = onlineUsers.some(u => u.email === adminItem.email);
                                return (
                                    <div
                                        key={adminItem._id}
                                        className="glass p-2 rounded-lg flex flex-col"
                                        style={{ border: '1px solid var(--border-accent)' }}
                                    >
                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {adminItem.email?.split('@')[0]}
                                                </p>
                                                <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                                    {adminItem.stationId || adminItem.sectionId}
                                                </p>
                                            </div>
                                        </div>
                                        {isOnline && (
                                            <button
                                                onClick={() => startCall(adminItem)}
                                                className="w-full p-1.5 rounded-lg transition-all bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center gap-1"
                                            >
                                                <Phone size={12} />
                                                <span className="text-xs">Call</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No admins available</p>
                        </div>
                    )}

                    {admins.length > 6 && (
                        <button
                            onClick={handleOpenFullPage}
                            className="w-full py-2 mt-2 text-xs font-medium rounded-lg transition-all"
                            style={{ color: 'var(--brand-orange)', background: 'rgba(234, 115, 23, 0.1)' }}
                        >
                            +{admins.length - 6} more
                        </button>
                    )}
                </div>
            )}

            {/* Status Bar */}
            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Users size={14} style={{ color: 'var(--brand-orange)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{onlineUsers.length} Active</span>
                </div>
                <button
                    onClick={handleOpenFullPage}
                    className="text-xs font-medium px-3 py-1 rounded-lg transition-all hover:scale-105"
                    style={{ background: 'var(--gradient-accent)', color: 'white' }}
                >
                    Full Page
                </button>
            </div>

            {/* Hidden audio element */}
            <audio ref={remoteAudioRef} autoPlay playsInline volume={1.0} muted={false} style={{ display: 'none' }} />
        </div>
    );
}
