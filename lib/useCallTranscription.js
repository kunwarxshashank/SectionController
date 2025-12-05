import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

/**
 * Custom hook for call transcription using react-speech-recognition
 * Starts/stops transcription based on call status and saves to database
 */
export const useCallTranscription = () => {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptSegments, setTranscriptSegments] = useState([]);
    const [callStartTime, setCallStartTime] = useState(null);
    const [currentCallId, setCurrentCallId] = useState(null);
    const lastTranscriptRef = useRef('');

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    // Check browser support
    const isSupported = browserSupportsSpeechRecognition;
    const hasMicrophone = isMicrophoneAvailable;

    // Generate unique call ID
    const generateCallId = () => {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Start transcription when call connects
    const startTranscription = useCallback(() => {
        if (!isSupported) {
            console.warn('Speech recognition not supported in this browser');
            return false;
        }

        resetTranscript();
        setTranscriptSegments([]);
        setCallStartTime(new Date());
        setCurrentCallId(generateCallId());
        lastTranscriptRef.current = '';

        SpeechRecognition.startListening({
            continuous: true,
            language: 'en-IN' // Indian English, change as needed
        });

        setIsTranscribing(true);
        console.log('🎙️ Transcription started');
        return true;
    }, [isSupported, resetTranscript]);

    // Stop transcription and return the data
    const stopTranscription = useCallback(() => {
        SpeechRecognition.stopListening();
        setIsTranscribing(false);

        const endTime = new Date();
        const duration = callStartTime
            ? Math.round((endTime - callStartTime) / 1000)
            : 0;

        const result = {
            callId: currentCallId,
            startTime: callStartTime,
            endTime: endTime,
            duration: duration,
            transcript: transcript,
            transcriptSegments: transcriptSegments
        };

        console.log('🎙️ Transcription stopped', result);

        // Reset state
        resetTranscript();
        setTranscriptSegments([]);
        setCallStartTime(null);
        setCurrentCallId(null);
        lastTranscriptRef.current = '';

        return result;
    }, [callStartTime, currentCallId, transcript, transcriptSegments, resetTranscript]);

    // Track new transcript segments
    useEffect(() => {
        if (isTranscribing && transcript && transcript !== lastTranscriptRef.current) {
            const newText = transcript.slice(lastTranscriptRef.current.length).trim();

            if (newText) {
                const segment = {
                    text: newText,
                    timestamp: new Date(),
                    speaker: 'local'
                };

                setTranscriptSegments(prev => [...prev, segment]);
                lastTranscriptRef.current = transcript;
            }
        }
    }, [transcript, isTranscribing]);

    // Save call log to database
    const saveCallLog = useCallback(async (callData, adminData) => {
        if (!callData.transcript && callData.transcriptSegments.length === 0) {
            console.log('📝 No transcript to save');
            return null;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const payload = {
                callId: callData.callId,
                callerId: adminData.email,
                callerSectionId: adminData.sectionId,
                calleeName: callData.calleeName,
                calleeSectionId: callData.calleeSectionId || null,
                callType: callData.callType, // 'outgoing' or 'incoming'
                startTime: callData.startTime,
                endTime: callData.endTime,
                duration: callData.duration,
                transcript: callData.transcript,
                transcriptSegments: callData.transcriptSegments,
                status: 'completed'
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/call-logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Call log saved:', result.data._id);
                return result.data;
            } else {
                console.error('❌ Failed to save call log:', result.message);
                return null;
            }
        } catch (error) {
            console.error('❌ Error saving call log:', error);
            return null;
        }
    }, []);

    return {
        // State
        isTranscribing,
        isSupported,
        hasMicrophone,
        transcript,
        transcriptSegments,
        listening,

        // Actions
        startTranscription,
        stopTranscription,
        saveCallLog,

        // Utils
        resetTranscript
    };
};

export default useCallTranscription;
