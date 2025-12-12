
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, StopCircle, Zap, AlertTriangle, Clock, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from './Button';
import { AnalysisPoint, SafetyStatus, SessionReport, Mentor } from '../types';
import { analyzeFrame, generateFinalSummary } from '../services/geminiService';
import { saveVideoBlob, saveReportMetadata } from '../services/storage';

interface SessionRecorderProps {
  mentor: Mentor;
  userId: string;
  userLanguage: string;
  onComplete: (report: SessionReport) => void;
  onCancel: () => void;
}

// 10 Minutes in milliseconds
const SESSION_DURATION = 10 * 60 * 1000; 
// Analyze every 20 seconds
const ANALYSIS_INTERVAL = 20000; 

// Type definition for SpeechRecognition (since it's not standard in all TS lib configs)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({ mentor, userId, userLanguage, onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION / 1000);
  const [analysisPoints, setAnalysisPoints] = useState<AnalysisPoint[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>("Initializing mentor AI...");
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisPoint | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Speech to Text (Live Context)
  const [isListening, setIsListening] = useState(false);
  const [liveContext, setLiveContext] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            setAvailableVoices(voices);
        }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Initialize Camera & Speech Recognition
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied. Please allow permissions to use the app.");
      }
    };
    initCamera();

    // Init Speech Rec
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = userLanguage === 'French' ? 'fr-FR' : userLanguage === 'Spanish' ? 'es-ES' : 'en-US';
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setLiveContext(transcript);
        };
        recognition.onerror = (event: any) => {
             // Handle specific error codes
            if (event.error === 'no-speech') {
                setIsListening(false);
                return;
            }
            if (event.error === 'not-allowed') {
                console.warn("Microphone access denied for speech recognition.");
                setIsListening(false);
                return;
            }
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };
        recognitionRef.current = recognition;
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [userLanguage]);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          alert("Voice commands not supported in this browser.");
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
      }
  };

  // Timer Logic
  useEffect(() => {
    if (!isRecording) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isRecording]);

  // TTS Logic
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    // Always cancel any ongoing speech immediately when dependencies change (e.g., toggling off, new suggestion)
    window.speechSynthesis.cancel();

    // If disabled or not recording, we stop here (after having cancelled)
    if (!isVoiceEnabled || !currentSuggestion || !isRecording) return;

    const utterance = new SpeechSynthesisUtterance(currentSuggestion);
    
    let langTag = 'en-US';
    switch (userLanguage) {
        case 'Spanish': langTag = 'es-ES'; break;
        case 'French': langTag = 'fr-FR'; break;
        default: langTag = 'en-US';
    }
    utterance.lang = langTag;

    const preferredVoice = availableVoices.find(v => 
        v.lang.startsWith(langTag.split('-')[0]) && (
            v.name.includes('Google') || 
            v.name.includes('Natural') || 
            v.name.includes('Premium') ||
            v.name.includes('Enhanced')
        )
    ) || availableVoices.find(v => v.lang.startsWith(langTag.split('-')[0]));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    if (mentor.id.includes('yoga')) {
        utterance.rate = 0.85; 
        utterance.pitch = 0.9; 
    } else if (mentor.id.includes('tag_team')) {
        utterance.rate = 1.2; 
        utterance.pitch = 1.1; 
    } else if (mentor.id.includes('debate')) {
        utterance.rate = 1.0; 
        utterance.pitch = 1.0;
    } else {
        utterance.rate = 1.05; 
        utterance.pitch = 1.0;
    }

    window.speechSynthesis.speak(utterance);
  }, [currentSuggestion, isVoiceEnabled, isRecording, userLanguage, availableVoices, mentor.id]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const MAX_WIDTH = 1024;
    const scale = Math.min(1, MAX_WIDTH / canvas.width);
    if (scale < 1) {
       canvas.width = canvas.width * scale;
       canvas.height = canvas.height * scale;
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
       ctx.drawImage(video, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
  }, []);

  const performAnalysis = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      const point = await analyzeFrame(frame, mentor, userLanguage, liveContext);
      
      if (point.safetyStatus === SafetyStatus.UNSAFE) {
        handleUnsafeContent();
        return;
      }

      setAnalysisPoints(prev => [...prev, point]);
      setLastAnalysis(point);
      setCurrentSuggestion(point.suggestion);
    } catch (err) {
      console.error("Analysis tick failed", err);
    }
  }, [captureFrame, mentor, userLanguage, liveContext]);

  useEffect(() => {
    if (!isRecording) return;
    performAnalysis();
    const interval = setInterval(performAnalysis, ANALYSIS_INTERVAL);
    return () => clearInterval(interval);
  }, [isRecording, performAnalysis]);

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setError(null);
  };

  const handleUnsafeContent = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setError("SAFETY ALERT: Toxic or unsafe content detected. Session terminated immediately.");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || isProcessing) return;
    setIsProcessing(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reportId = crypto.randomUUID();
        
        try {
          await saveVideoBlob(reportId, blob);
        } catch (e) {
          console.warn("Could not save video blob:", e);
        }

        const { keyInsights, overallScore } = await generateFinalSummary(analysisPoints, mentor, userLanguage);

        const report: SessionReport = {
          id: reportId,
          userId,
          startTime: Date.now() - (SESSION_DURATION - timeLeft * 1000), 
          endTime: Date.now(),
          durationSeconds: SESSION_DURATION / 1000 - timeLeft,
          activityType: mentor.name,
          overallScore,
          keyInsights,
          timeline: analysisPoints,
          videoBlobKey: reportId,
          isFlagged: false
        };

        await saveReportMetadata(report);
        onComplete(report);
      } catch (err) {
        setError("Failed to process session data.");
        setIsProcessing(false);
      }
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-dark text-white">
        <AlertTriangle className="w-16 h-16 text-danger mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-danger">Session Terminated</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <Button onClick={onCancel} variant="secondary">Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-black overflow-hidden rounded-xl border border-gray-800">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="flex-1 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm font-mono text-white tracking-wider">
            {isRecording ? 'REC' : 'STANDBY'}
          </span>
        </div>
        
        <div className="flex items-center space-x-3 pointer-events-auto">
             {/* Speech to Text Toggle */}
             <button 
                onClick={toggleListening}
                className={`p-2 rounded-full backdrop-blur-md border transition-colors flex items-center justify-center ${
                    isListening ? 'bg-red-500/80 border-red-500 text-white animate-pulse' : 'bg-black/40 border-gray-600 text-gray-400'
                }`}
                title={isListening ? "Listening... Click to stop" : "Speak Instruction"}
             >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
             </button>

             {/* TTS Toggle */}
             <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-2 rounded-full backdrop-blur-md border transition-colors ${isVoiceEnabled ? 'bg-primary/80 border-primary text-white' : 'bg-black/40 border-gray-600 text-gray-400'}`}
                title={isVoiceEnabled ? "Mute Mentor" : "Enable Voice Feedback"}
             >
                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
             </button>

            {isRecording && (
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-700">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-mono text-white">{formatTime(timeLeft)}</span>
                </div>
            )}
        </div>
      </div>

      {/* AI Feedback Overlay */}
      {isRecording && (
        <div className="absolute bottom-24 left-4 right-4 animate-fade-in pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md border border-primary/30 p-4 rounded-lg shadow-xl max-w-xl mx-auto">
            {/* Show User's Spoken Instruction */}
            {liveContext && (
                <div className="mb-3 bg-white/10 p-2 rounded border border-white/20 flex items-center justify-between">
                    <span className="text-xs text-gray-300 italic">You: "{liveContext}"</span>
                    <button onClick={() => setLiveContext('')} className="pointer-events-auto text-xs text-gray-400 hover:text-white ml-2">Clear</button>
                </div>
            )}

            <div className="flex items-start space-x-3">
              <div className="bg-primary/20 p-2 rounded-full flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Live {mentor.name} Insight</p>
                <p className="text-white text-sm md:text-base leading-relaxed">{currentSuggestion}</p>
                {lastAnalysis && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {lastAnalysis.goodPoints && lastAnalysis.goodPoints.length > 0 && (
                            <div className="text-green-400">
                                <span className="font-bold block">Going Well:</span>
                                {lastAnalysis.goodPoints[0]}
                            </div>
                        )}
                        {lastAnalysis.improvements && lastAnalysis.improvements.length > 0 && (
                            <div className="text-yellow-400">
                                <span className="font-bold block">Needs Focus:</span>
                                {lastAnalysis.improvements[0]}
                            </div>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center items-center space-x-6 pointer-events-auto">
        {!isRecording && !isProcessing && (
          <>
            <Button onClick={onCancel} variant="ghost" size="md">Cancel</Button>
            <Button onClick={startRecording} variant="primary" size="xl" className="rounded-full shadow-primary/40">
              <Camera className="mr-2 h-6 w-6" /> Start Session
            </Button>
          </>
        )}
        
        {isRecording && (
          <Button onClick={stopRecording} variant="danger" size="xl" className="rounded-full">
            <StopCircle className="mr-2 h-6 w-6" /> Stop & Analyze
          </Button>
        )}

        {isProcessing && (
           <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
             <p className="text-white text-sm">Finalizing Mentor Report...</p>
           </div>
        )}
      </div>
    </div>
  );
};
