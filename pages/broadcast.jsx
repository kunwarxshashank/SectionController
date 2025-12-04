import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Phone, PhoneOff, Mic, MicOff, FileText } from 'lucide-react';
import io from 'socket.io-client';
import { useCallTranscription } from '@/lib/useCallTranscription';

export default function BroadcastPage() {
    const router = useRouter();
    const { authenticated, loading, admin } = useAuth();
    const [admins, setAdmins] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    // Call state
    const [activeCall, setActiveCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callStatus, setCallStatus] = useState(''); // idle, calling, ringing, connected
    const [isMuted, setIsMuted] = useState(false);
    const [currentCallType, setCurrentCallType] = useState(null); // 'outgoing' or 'incoming'

    // Speech recognition / transcription
    const {
        isTranscribing,
        isSupported: transcriptionSupported,
        transcript,
        startTranscription,
        stopTranscription,
        saveCallLog
    } = useCallTranscription();

    // WebRTC refs
    const remoteAudioRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const iceCandidateBuffer = useRef([]);

    // ICE servers configuration
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]
    };

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

    // Monitor remote stream and ensure it's set to audio element
    useEffect(() => {
        if (remoteAudioRef.current && peerConnection.current) {
            const pc = peerConnection.current;

            // Manually check for remote streams
            const receivers = pc.getReceivers();
            console.log('📡 Checking receivers:', receivers.length);

            receivers.forEach(receiver => {
                if (receiver.track && receiver.track.kind === 'audio') {
                    const stream = new MediaStream([receiver.track]);
                    console.log('🔊 Manually setting audio stream to element');
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch(e => console.log('▶️ Play error (can ignore):', e.message));
                }
            });
        }
    }, [callStatus, activeCall]);

    // Start transcription when call connects
    useEffect(() => {
        if (callStatus === 'connected' && !isTranscribing && transcriptionSupported) {
            console.log('🎙️ Starting transcription for connected call');
            startTranscription();
        }
    }, [callStatus, isTranscribing, transcriptionSupported, startTranscription]);

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
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
        const pc = new RTCPeerConnection(iceServers);

        // Store target email for ICE candidates
        pc._targetEmail = null;

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && pc._targetEmail) {
                console.log('Sending ICE candidate to:', pc._targetEmail);
                socket.emit('ice-candidate', {
                    to: pc._targetEmail,
                    candidate: event.candidate
                });
            } else if (!event.candidate) {
                console.log('All ICE candidates have been sent');
            }
        };

        pc.ontrack = (event) => {
            console.log('🎵 Received remote track:', event.track.kind, 'Streams:', event.streams.length);
            const remoteStream = event.streams[0];

            console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));

            // Set remote stream to audio element for audio calls
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream;
                console.log('✅ Set remote stream to audio element');
                // Ensure audio plays
                remoteAudioRef.current.play().catch(e => console.log('▶️ Auto-play blocked:', e.message));
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
            console.log('Signaling state:', pc.signalingState);
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setCallStatus('connected');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            }
        };

        return pc;
    };

    // Start call (audio only)
    const startCall = async (targetAdmin) => {
        try {
            console.log('📞 Starting audio call to:', targetAdmin.email);
            setActiveCall(targetAdmin);
            setCurrentCallType('outgoing');
            setCallStatus('calling');
            iceCandidateBuffer.current = [];

            // Get user media (audio only)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            if (stream) {
                console.log("GOT THE STREAM...")
            }

            console.log('🎤 Got local stream with tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

            localStream.current = stream;

            // Create peer connection
            peerConnection.current = createPeerConnection();
            // Set target email for ICE candidates
            peerConnection.current._targetEmail = targetAdmin.email;

            // Add tracks to peer connection
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
                console.log('➕ Added track to peer connection:', track.kind);
            });

            // Create offer
            const offer = await peerConnection.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            console.log('📤 Created offer:', offer.type);
            await peerConnection.current.setLocalDescription(offer);

            // Send offer via socket
            socket.emit('call-user', {
                from: admin.email,
                to: targetAdmin.email,
                offer: offer,
                callType: 'audio'
            });

        } catch (error) {
            console.error('❌ Error starting call:', error);
            alert('Could not start call. Please check microphone permissions.');
            setActiveCall(null);
            setCallStatus('');
        }
    };

    // Handle incoming call
    const handleIncomingCall = async (data) => {
        setIncomingCall({
            from: data.from,
            offer: data.offer,
            callType: data.callType
        });
        setCallStatus('ringing');
    };

    // Accept call (audio only)
    const acceptCall = async () => {
        try {
            const callerEmail = incomingCall.from;
            console.log('📞 Accepting call from:', callerEmail);
            iceCandidateBuffer.current = [];

            // Get user media (audio only)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            console.log('🎤 Got local stream with tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

            localStream.current = stream;

            // Create peer connection
            peerConnection.current = createPeerConnection();
            // Set target email for ICE candidates
            peerConnection.current._targetEmail = callerEmail;

            // Add tracks BEFORE setting remote description
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
                console.log('➕ Added track to peer connection:', track.kind);
            });

            // Set remote description
            console.log('📥 Setting remote description (offer)');
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(incomingCall.offer)
            );

            // Process buffered ICE candidates after setting remote description
            console.log('Processing buffered ICE candidates:', iceCandidateBuffer.current.length);
            for (const candidate of iceCandidateBuffer.current) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('✅ Added buffered ICE candidate');
                } catch (e) {
                    console.error('❌ Failed to add buffered ICE candidate:', e);
                }
            }
            iceCandidateBuffer.current = [];

            // Create answer
            const answer = await peerConnection.current.createAnswer();
            console.log('📤 Created answer:', answer.type);
            await peerConnection.current.setLocalDescription(answer);

            // Send answer
            socket.emit('call-accepted', {
                to: callerEmail,
                from: admin.email,
                answer: answer
            });

            // Set activeCall with the caller's email
            setActiveCall({ email: callerEmail });
            setIncomingCall(null);
            setCallStatus('connected');
            setCurrentCallType('incoming');

            // Ensure remote audio plays after a short delay
            setTimeout(() => {
                if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
                    remoteAudioRef.current.play().catch(e => console.log('▶️ Play retry:', e.message));
                }
            }, 500);

        } catch (error) {
            console.error('❌ Error accepting call:', error);
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
            console.log('📥 Call accepted, setting remote description (answer)');
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );

            // Process buffered ICE candidates
            console.log('Processing buffered ICE candidates:', iceCandidateBuffer.current.length);
            for (const candidate of iceCandidateBuffer.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateBuffer.current = [];

            setCallStatus('connected');
        } catch (error) {
            console.error('❌ Error handling call accepted:', error);
        }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data) => {
        try {
            console.log('🧊 Received ICE candidate');
            if (peerConnection.current && peerConnection.current.remoteDescription) {
                await peerConnection.current.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                );
                console.log('✅ Added ICE candidate');
            } else {
                console.log('⏳ Buffering ICE candidate (no remote description yet)');
                iceCandidateBuffer.current.push(data.candidate);
            }
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    };

    // End call
    const endCall = async () => {
        // Stop transcription and save if active
        if (isTranscribing && activeCall) {
            const transcriptData = stopTranscription();
            if (transcriptData && admin) {
                await saveCallLog(
                    {
                        ...transcriptData,
                        calleeName: activeCall.email,
                        calleeSectionId: activeCall.sectionId || null,
                        callType: currentCallType || 'outgoing'
                    },
                    admin
                );
            }
        }

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

    // Handle call ended
    const handleCallEnded = () => {
        endCall();
    };

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!authenticated) {
        router.push('/login');
        return null;
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 font-railway" style={{ color: 'var(--text-primary)' }}>
                    📞 Hotline Communication
                </h1>

                {/* Incoming Call Modal */}
                {incomingCall && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="glass-dark p-8 rounded-2xl max-w-md w-full">
                            <div className="text-center mb-6">
                                <Phone size={64} className="text-green-500 mx-auto mb-4 animate-pulse" />
                                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Incoming Call</h2>
                                <p className="text-gray-300">{incomingCall.from}</p>
                                <p className="text-sm text-gray-400 mt-2">Audio Call</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={acceptCall}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={rejectCall}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-12 gap-6">
                    {/* Main Panel */}
                    <div className="col-span-8">
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Section Controllers Directory</h2>

                            {activeCall ? (
                                <div>
                                    {/* Active Call UI */}
                                    <div className="glass-orange p-6 rounded-xl mb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                                    {activeCall.email}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full live-pulse"></div>
                                                    <span className="text-sm text-green-300">
                                                        {callStatus === 'connected' ? 'Connected' : 'Connecting...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audio call indicator */}
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                                                <Phone size={48} className="text-green-400" />
                                            </div>
                                        </div>

                                        {/* Transcription indicator */}
                                        {transcriptionSupported && (
                                            <div className="mb-4">
                                                <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${isTranscribing ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                                                    <FileText size={16} className={isTranscribing ? 'text-red-400' : 'text-gray-400'} />
                                                    <span className={`text-sm ${isTranscribing ? 'text-red-300' : 'text-gray-400'}`}>
                                                        {isTranscribing ? '🔴 Recording Transcript...' : 'Transcript Ready'}
                                                    </span>
                                                </div>
                                                {isTranscribing && transcript && (
                                                    <div className="mt-2 p-3 bg-black/30 rounded-lg max-h-24 overflow-y-auto">
                                                        <p className="text-xs text-gray-300 italic">
                                                            "{transcript.slice(-150)}{transcript.length > 150 ? '...' : ''}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Call controls */}
                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                onClick={toggleMute}
                                                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
                                            >
                                                {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                                            </button>

                                            <button
                                                onClick={endCall}
                                                className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all flex items-center gap-2"
                                            >
                                                <PhoneOff size={24} />
                                                End Call
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {admins.map((adminItem) => {
                                        const isOnline = onlineUsers.some(u => u.email === adminItem.email);
                                        return (
                                            <div key={adminItem._id} className="card-hover border border-white/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{adminItem.email}</h3>
                                                        <p className="text-sm text-gray-400">Section: {adminItem.sectionId}</p>
                                                    </div>
                                                    <span className={`badge ${isOnline ? 'badge-low' : 'badge-medium'}`}>
                                                        {isOnline ? 'online' : 'offline'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => startCall(adminItem)}
                                                        disabled={!isOnline}
                                                        className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center space-x-2"
                                                    >
                                                        <Phone size={18} />
                                                        <span>Call</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="col-span-4">
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Online Users</h3>
                            <div className="space-y-2">
                                {onlineUsers.length > 0 ? (
                                    onlineUsers.map((user, idx) => (
                                        <div key={idx} className="glass-dark p-3 rounded-lg flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
                                                <p className="text-gray-400 text-xs">{user.sectionId}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-4">No users online</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Always-present audio element for remote stream */}
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                volume={1.0}
                muted={false}
                controls={false}
                style={{ display: 'none' }}
            />
        </Layout>
    );
}
