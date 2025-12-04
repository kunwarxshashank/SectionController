import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Phone, Radio as RadioIcon, MessageSquare, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import io from 'socket.io-client';

export default function BroadcastPage() {
    const router = useRouter();
    const { authenticated, loading, admin } = useAuth();
    const [activeTab, setActiveTab] = useState('hotline');
    const [admins, setAdmins] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    // Call state
    const [activeCall, setActiveCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callStatus, setCallStatus] = useState(''); // idle, calling, ringing, connected
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    // Radio state
    const [isPTT, setIsPTT] = useState(false);
    const [radioChannel, setRadioChannel] = useState(1);
    const [activeRadioUser, setActiveRadioUser] = useState(null);

    // WebRTC refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const radioStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
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

            // Radio events
            newSocket.on('radio-ptt-start', (data) => {
                setActiveRadioUser(data.from);
            });

            newSocket.on('radio-ptt-end', () => {
                setActiveRadioUser(null);
            });

            newSocket.on('radio-audio', async (data) => {
                // Play received radio audio
                if (radioStreamRef.current) {
                    const audioBlob = new Blob([data.audio], { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            });

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
        const pc = new RTCPeerConnection();

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && activeCall) {
             console.log('Sending ICE candidate to:', activeCall.email);
                socket.emit('ice-candidate', {
                    to: activeCall.email,
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

            // Set remote stream to audio element for audio-only calls
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream;
                console.log('✅ Set remote stream to audio element');
            }

            // Set remote stream to video element for video calls
            
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


    // Start call
    const startCall = async (targetAdmin, videoCall = false) => {
        try {
            console.log('📞 Starting call to:', targetAdmin.email, 'Video:', videoCall);
            setActiveCall(targetAdmin);
            setCallStatus('calling');
            setIsVideoEnabled(videoCall);
            iceCandidateBuffer.current = [];

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: videoCall
            });
            if(stream){
                console.log('🎤 Got local stream with tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
            }

            localStream.current = stream;
            if (localVideoRef.current && videoCall) {
                localVideoRef.current.srcObject = stream;
            }

            // Create peer connection
            peerConnection.current = await createPeerConnection();

            // Add tracks to peer connection
            stream.getTracks().forEach(track => {
                const sender = peerConnection.current.addTrack(track, stream);
                console.log('➕ Added track to peer connection:', track.kind);
            });

            // Create offer
            const offer = await peerConnection.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: videoCall
            });
            console.log('📤 Created offer:', offer.type);
            await peerConnection.current.setLocalDescription(offer);

            // Send offer via socket
            socket.emit('call-user', {
                from: admin.email,
                to: targetAdmin.email,
                offer: offer,
                callType: videoCall ? 'video' : 'audio'
            });

        } catch (error) {
            console.error('❌ Error starting call:', error);
            alert('Could not start call. Please check permissions.');
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


    // Accept call
    const acceptCall = async () => {
        try {
            console.log('📞 Accepting call from:', incomingCall.from);
            const isVideo = incomingCall.callType === 'video';
            setIsVideoEnabled(isVideo);
            iceCandidateBuffer.current = [];

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: isVideo
            });

            console.log('🎤 Got local stream with tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

            localStream.current = stream;
            if (localVideoRef.current && isVideo) {
                localVideoRef.current.srcObject = stream;
            }

            // Create peer connection
            peerConnection.current = createPeerConnection();

            // Add tracks
            stream.getTracks().forEach(track => {
                const sender = peerConnection.current.addTrack(track, stream);
                console.log('➕ Added track to peer connection:', track.kind);
            });

            // Set remote description
            console.log('📥 Setting remote description (offer)');
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(incomingCall.offer)
            );

            // Process buffered ICE candidates
            console.log('Processing buffered ICE candidates:', iceCandidateBuffer.current.length);
            for (const candidate of iceCandidateBuffer.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateBuffer.current = [];

            // Create answer
            const answer = await peerConnection.current.createAnswer();
            console.log('📤 Created answer:', answer.type);
            await peerConnection.current.setLocalDescription(answer);

            // Send answer
            socket.emit('call-accepted', {
                to: incomingCall.from,
                answer: answer
            });

            setActiveCall({ email: incomingCall.from });
            setIncomingCall(null);
            setCallStatus('connected');

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
        setIsVideoEnabled(false);
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

    // Toggle video
    const toggleVideo = () => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    // Radio PTT functions
    const startPTT = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            radioStreamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                socket.emit('radio-audio', {
                    from: admin.email,
                    audio: audioBlob
                });
                stream.getTracks().forEach(track => track.stop());
                radioStreamRef.current = null;
            };

            mediaRecorder.start();
            setIsPTT(true);

            socket.emit('radio-ptt-start', {
                from: admin.email,
                channel: radioChannel
            });
        } catch (error) {
            console.error('Error starting PTT:', error);
        }
    };

    const endPTT = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsPTT(false);
        socket?.emit('radio-ptt-end', { from: admin.email });
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
                    📡 Broadcast & Communication
                </h1>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setActiveTab('hotline')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'hotline'
                            ? 'shadow-lg'
                            : 'glass-dark hover:bg-white/10'
                            }`}
                        style={activeTab === 'hotline' ? {
                            background: 'var(--gradient-accent)',
                            color: 'white'
                        } : {
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <Phone size={20} />
                        <span>Hotline</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('radio')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'radio'
                            ? 'shadow-lg'
                            : 'glass-dark hover:bg-white/10'
                            }`}
                        style={activeTab === 'radio' ? {
                            background: 'var(--gradient-accent)',
                            color: 'white'
                        } : {
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <RadioIcon size={20} />
                        <span>Radio</span>
                    </button>
                </div>

                {/* Incoming Call Modal */}
                {incomingCall && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="glass-dark p-8 rounded-2xl max-w-md w-full">
                            <div className="text-center mb-6">
                                <Phone size={64} className="text-green-500 mx-auto mb-4 animate-pulse" />
                                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Incoming Call</h2>
                                <p className="text-gray-300">{incomingCall.from}</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    {incomingCall.callType === 'video' ? 'Video Call' : 'Audio Call'}
                                </p>
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
                            {activeTab === 'hotline' && (
                                <div>
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

                                                {/* Video containers */}
                                                {isVideoEnabled && (
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                                            <video
                                                                ref={remoteVideoRef}
                                                                autoPlay
                                                                playsInline
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                                                                Remote
                                                            </div>
                                                        </div>
                                                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                                            <video
                                                                ref={localVideoRef}
                                                                autoPlay
                                                                playsInline
                                                                muted
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                                                                You
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Call controls */}
                                                <div className="flex items-center justify-center gap-4">
                                                    <button
                                                        onClick={toggleMute}
                                                        className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                                                            }`}
                                                    >
                                                        {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                                                    </button>
                                                    {isVideoEnabled && (
                                                        <button
                                                            onClick={toggleVideo}
                                                            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-all"
                                                        >
                                                            {isVideoEnabled ? <Video size={24} className="text-white" /> : <VideoOff size={24} className="text-white" />}
                                                        </button>
                                                    )}

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
                                                                onClick={() => startCall(adminItem, false)}
                                                                disabled={!isOnline}
                                                                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center space-x-2"
                                                            >
                                                                <Phone size={18} />
                                                                <span>Audio</span>
                                                            </button>
                                                            <button
                                                                onClick={() => startCall(adminItem, true)}
                                                                disabled={!isOnline}
                                                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center space-x-2"
                                                            >
                                                                <Video size={18} />
                                                                <span>Video</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'radio' && (
                                <div>
                                    <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Radio Communication</h2>

                                    <div className="glass-dark p-6 rounded-xl mb-4">
                                        <div className="text-center mb-6">
                                            <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 rounded-full mb-4">
                                                <RadioIcon size={48} className="text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">Channel {radioChannel} - Main</h3>
                                            <p className="text-sm text-gray-400">Push and hold to talk</p>
                                            {activeRadioUser && (
                                                <div className="mt-4 flex items-center justify-center gap-2">
                                                    <Volume2 size={20} className="text-green-500 animate-pulse" />
                                                    <span className="text-green-400 font-medium">{activeRadioUser} is speaking</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onMouseDown={startPTT}
                                            onMouseUp={endPTT}
                                            onTouchStart={startPTT}
                                            onTouchEnd={endPTT}
                                            className={`w-full py-4 font-bold text-lg rounded-xl transition select-none ${isPTT
                                                ? 'bg-red-500 text-white scale-95'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                }`}
                                        >
                                            {isPTT ? '🔴 TRANSMITTING...' : '🎙️ PRESS TO TALK'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4].map((ch) => (
                                            <button
                                                key={ch}
                                                onClick={() => setRadioChannel(ch)}
                                                className={`px-4 py-2 rounded-lg transition-all font-medium ${radioChannel === ch
                                                    ? 'text-white'
                                                    : 'hover:bg-white/10'
                                                    }`}
                                                style={radioChannel === ch ? {
                                                    background: 'var(--gradient-accent)',
                                                    color: 'white'
                                                } : {
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                CH {ch}
                                            </button>
                                        ))}
                                    </div>
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
