import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from '../utils/audio';

// System instruction to define the persona
const MARCUS_AURELIUS_INSTRUCTION = `
You are Marcus Aurelius Antoninus, Emperor of Rome and Stoic philosopher. 
You are speaking directly to a student who seeks wisdom. 
Your voice is deep, calm, resonant, and reflective, never hurried or anxious.
Speak in a somewhat formal, timeless, and dignified manner, but remain accessible and clear. 
Offer guidance based on Stoic principles: the dichotomy of control, the nature of the universe, the brevity of life, and the importance of virtue and reason.
Do not break character. 
Keep your responses relatively concise to suit a natural voice conversation. 
If asked about modern topics, relate them back to eternal Stoic truths.
`;

export const useGeminiLive = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback queue management
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session management
  const sessionRef = useRef<Promise<any> | null>(null);
  const activeSessionRef = useRef<boolean>(false);
  const isTurnCompleteRef = useRef<boolean>(true);

  // Cleanup function
  const disconnect = useCallback(() => {
    activeSessionRef.current = false;
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    scheduledSourcesRef.current.clear();

    if (inputContextRef.current) {
      inputContextRef.current.close();
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
    setTranscript("");
    sessionRef.current = null;
    isTurnCompleteRef.current = true;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnectionState(ConnectionState.CONNECTING);
    setTranscript("");

    try {
      // 1. Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Setup Audio Graph for Input
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceRef.current = inputContextRef.current.createMediaStreamSource(streamRef.current);
      inputNodeRef.current = inputContextRef.current.createGain();
      
      processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(inputContextRef.current.destination);

      // 3. Setup Audio Graph for Output
      outputNodeRef.current = outputContextRef.current.createGain();
      analyserRef.current = outputContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(outputContextRef.current.destination);

      // 4. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      nextStartTimeRef.current = 0;
      activeSessionRef.current = true;
      isTurnCompleteRef.current = true;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          systemInstruction: MARCUS_AURELIUS_INSTRUCTION,
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setConnectionState(ConnectionState.CONNECTED);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!activeSessionRef.current) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputNodeRef.current) {
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.addEventListener('ended', () => {
                scheduledSourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              scheduledSourcesRef.current.add(source);
            }

            // Handle Transcription
            const transcriptionText = message.serverContent?.outputTranscription?.text;
            if (transcriptionText) {
              if (isTurnCompleteRef.current) {
                setTranscript(transcriptionText);
                isTurnCompleteRef.current = false;
              } else {
                setTranscript(prev => prev + transcriptionText);
              }
            }

            if (message.serverContent?.turnComplete) {
              isTurnCompleteRef.current = true;
            }

            // Handle Interruption
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
               scheduledSourcesRef.current.forEach(source => {
                 try { source.stop(); } catch (e) {}
               });
               scheduledSourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setTranscript("");
               isTurnCompleteRef.current = true;
            }
          },
          onclose: () => {
            console.log('Gemini Live Session Closed');
            if (activeSessionRef.current) {
              disconnect();
            }
          },
          onerror: (err) => {
            console.error('Gemini Live Error:', err);
            setError("Connection disrupted. The gods are silent.");
            disconnect();
          }
        }
      });

      sessionRef.current = sessionPromise;

      // 5. Start Input Streaming
      processorRef.current.onaudioprocess = (e) => {
        if (!activeSessionRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        sessionPromise.then((session) => {
           session.sendRealtimeInput({ media: pcmBlob });
        });
      };

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize audio.");
      disconnect();
    }
  }, [disconnect]);

  // Volume Polling
  useEffect(() => {
    if (connectionState !== ConnectionState.CONNECTED) return;
    
    const interval = setInterval(() => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolume(avg);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [connectionState]);

  return {
    connectionState,
    connect,
    disconnect,
    volume,
    error,
    transcript
  };
};