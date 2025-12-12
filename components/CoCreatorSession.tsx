
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Monitor, X, AlertTriangle, ArrowRight, Volume2, VolumeX, CheckCircle, Flame, Users, Mic, MicOff, Activity, AppWindow, Layout } from 'lucide-react';
import { Button } from './Button';
import { AnalysisPoint, SafetyStatus, Mentor } from '../types';
import { analyzeFrame } from '../services/geminiService';

interface CoCreatorSessionProps {
  mentor: Mentor;
  userLanguage: string;
  onClose: () => void;
}

const ANALYSIS_INTERVAL = 10000; // Analyze every 10 seconds normally

// Type definition for SpeechRecognition
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const CoCreatorSession: React.FC<CoCreatorSessionProps> = ({ mentor, userLanguage, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLive, setIsLive] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>("Ready to connect...");
  const [currentActivity, setCurrentActivity] = useState<string>("Waiting for screen share...");
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [liveContext, setLiveContext] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Capture Frame Logic (Moved up to be accessible by performAnalysis)
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Check if video has data
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Increased max width to 1920 for better text readability on screen shares
    const MAX_WIDTH = 1920; 
    const scale = Math.min(1, MAX_WIDTH / canvas.width);
    
    if (scale < 1) {
       canvas.width = Math.floor(canvas.width * scale);
       canvas.height = Math.floor(canvas.height * scale);
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
       ctx.drawImage(video, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]; 
  }, []);

  // Analysis Logic
  const performAnalysis = useCallback(async (manualContext?: string) => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      setIsAnalyzing(true);
      // Use manual context (from immediate speech) or stored liveContext
      const contextToSend = manualContext !== undefined ? manualContext : liveContext;
      
      const point = await analyzeFrame(frame, mentor, userLanguage, contextToSend);
      setIsAnalyzing(false);
      
      if (point.safetyStatus === SafetyStatus.UNSAFE) {
        handleStop();
        setError("SAFETY ALERT: The AI detected unsafe content. Session terminated.");
        return;
      }

      setLastAnalysis(point);
      setCurrentSuggestion(point.suggestion);
      if (point.detectedActivity) {
          setCurrentActivity(point.detectedActivity);
      }
    } catch (err) {
      console.error("Co-creation analysis failed", err);
      setIsAnalyzing(false);
    }
  }, [captureFrame, mentor, userLanguage, liveContext]);

  // Initialize Speech Rec
  useEffect(() => {
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
            // TRIGGER IMMEDIATE ANALYSIS ON VOICE INPUT
            if (isLive) {
                performAnalysis(transcript);
            }
        };
        recognition.onerror = (event: any) => {
            // Handle specific error codes
            if (event.error === 'no-speech') {
                // User didn't say anything, just stop listening silently
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
        if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [userLanguage, isLive, performAnalysis]);

  const toggleListening = () => {
      if (!recognitionRef.current) return;
      if (isListening) recognitionRef.current.stop();
      else recognitionRef.current.start();
  };

  // TTS Logic
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    
    // Always cancel immediately if things change or voice is disabled
    window.speechSynthesis.cancel();

    if (!isVoiceEnabled || !currentSuggestion || !isLive) return;

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
            v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')
        )
    ) || availableVoices.find(v => v.lang.startsWith(langTag.split('-')[0]));

    if (preferredVoice) utterance.voice = preferredVoice;

    if (mentor.id.includes('coworker')) {
        utterance.rate = 1.05; utterance.pitch = 1.0;
    } else if (mentor.id.includes('tag_team')) {
        utterance.rate = 1.2; utterance.pitch = 1.1; 
    } else {
        utterance.rate = 1.1; utterance.pitch = 1.0;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [currentSuggestion, isVoiceEnabled, isLive, userLanguage, availableVoices, mentor.id]);

  const startScreenShare = async (preferredSurface?: 'monitor' | 'window' | 'browser') => {
    try {
      setError(null);
      const videoConstraints: any = { cursor: "always" };
      if (preferredSurface) videoConstraints.displaySurface = preferredSurface;

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: videoConstraints, audio: false });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Important: Wait for metadata to ensure dimensions are ready
        videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             // Initial analysis after a short delay to let screen render
             setTimeout(() => performAnalysis(), 2000);
        };
      }
      
      setIsLive(true);
      setCurrentSuggestion(`Connected. I'm watching your screen.`);
      
      stream.getVideoTracks()[0].onended = () => handleStop();

    } catch (err: any) {
      console.error("Screen share error:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
         setError("Permission cancelled.");
      } else {
         setError("Could not start screen share.");
      }
    }
  };

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => performAnalysis(), ANALYSIS_INTERVAL);
    return () => clearInterval(interval);
  }, [isLive, performAnalysis]);

  const handleStop = () => {
    setIsLive(false);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setCurrentSuggestion("Session stopped.");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-dark text-white">
        <AlertTriangle className="w-16 h-16 text-danger mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
        <p className="text-gray-300 mb-6 max-w-md">{error}</p>
        <div className="flex space-x-4">
            <Button onClick={onClose} variant="ghost">Back to Dashboard</Button>
            <Button onClick={() => { setError(null); }} variant="primary">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-gray-900 overflow-hidden rounded-xl border border-gray-800">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur border-b border-gray-800 z-10 flex justify-between items-center">
         <div className="flex items-center space-x-3">
            <div className="bg-primary/20 p-2 rounded-lg">
                <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
                <h3 className="font-bold text-white text-sm">{mentor.name}</h3>
                <p className="text-xs text-gray-400">Live Screen Analysis</p>
            </div>
         </div>
         <div className="flex items-center space-x-2">
            <button 
                onClick={toggleListening}
                className={`p-2 rounded-full border transition-colors flex items-center ${isListening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                title="Talk to Mentor"
            >
                {isListening ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                <span className="text-xs font-bold hidden md:inline">{isListening ? 'Listening...' : 'Talk Back'}</span>
            </button>

            <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-2 rounded-full border transition-colors ${isVoiceEnabled ? 'bg-primary/20 border-primary text-primary' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
            >
                {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <Button size="sm" variant={isLive ? "danger" : "secondary"} onClick={isLive ? handleStop : onClose}>
                {isLive ? <><X className="w-4 h-4 mr-2" /> Stop Session</> : "Close"}
            </Button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-32 bg-black relative">
         {!isLive ? (
             <div className="text-center p-8 max-w-2xl w-full animate-fade-in">
                 <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Monitor className="w-10 h-10 text-primary" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-2">Ready to Collaborate</h2>
                 <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    You have selected <span className="text-primary font-bold">{mentor.name}</span>. 
                    <br/>
                    <span className="text-sm italic opacity-80">"{mentor.goals}"</span>
                 </p>
                 
                 <div className="flex flex-col space-y-4 max-w-md mx-auto">
                    <Button onClick={() => startScreenShare('monitor')} size="xl" className="w-full h-16 text-lg shadow-primary/25">
                        <Monitor className="w-6 h-6 mr-3" /> Start Screen Share
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => startScreenShare('window')} variant="secondary" className="h-12 border-gray-700 hover:border-gray-500">
                             <AppWindow className="w-4 h-4 mr-2 text-blue-400" /> Share Window
                        </Button>
                        <Button onClick={() => startScreenShare('browser')} variant="secondary" className="h-12 border-gray-700 hover:border-gray-500">
                             <Layout className="w-4 h-4 mr-2 text-orange-400" /> Share Tab
                        </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-4">
                        Your screen is analyzed locally in your browser. No video is permanently stored.
                    </p>
                 </div>
             </div>
         ) : (
            <>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-700"
                />
                
                {/* Current Activity Overlay (Top Center) */}
                <div className="absolute top-24 bg-black/70 backdrop-blur-md border border-gray-600 rounded-full px-4 py-2 flex items-center shadow-lg animate-fade-in">
                    <Activity className="w-4 h-4 text-green-400 mr-2 animate-pulse" />
                    <span className="text-white text-sm font-medium">
                        {isAnalyzing ? "Analyzing Frame..." : `Detecting: ${currentActivity}`}
                    </span>
                </div>
            </>
         )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Ticker Chat at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-md border-t border-gray-800 flex items-center overflow-hidden z-20">
          <div className="flex-shrink-0 px-6 bg-black h-full flex items-center z-10 border-r border-gray-800">
              <div className="flex flex-col w-24">
                  <span className="text-xs text-primary font-bold uppercase tracking-wider">Mentor Stream</span>
                  {isAnalyzing ? (
                      <span className="text-[10px] text-yellow-500 animate-pulse font-mono mt-1">Thinking...</span>
                  ) : (
                      <span className="text-[10px] text-green-500 font-mono mt-1">Connected</span>
                  )}
              </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative h-full flex items-center bg-black/50">
             {liveContext ? (
                 <div className="absolute inset-0 flex items-center justify-center bg-primary/20 px-4 animate-fade-in z-20">
                     <span className="text-white italic text-lg">You: "{liveContext}"</span>
                     <button onClick={() => setLiveContext('')} className="ml-4 text-xs text-gray-300 underline">Clear</button>
                 </div>
             ) : (
                <div className="whitespace-nowrap animate-marquee text-xl text-white font-medium pl-4 leading-relaxed">
                    {currentSuggestion}
                </div>
             )}
          </div>

          <div className="flex-shrink-0 w-64 px-4 h-full bg-black/50 border-l border-gray-800 flex flex-col justify-center space-y-2 z-10 text-xs">
              <div className="flex items-center text-green-400">
                  <CheckCircle className="w-3 h-3 mr-2" />
                  <span className="truncate">{lastAnalysis?.goodPoints?.[0] || 'Analyzing...'}</span>
              </div>
              <div className="flex items-center text-yellow-400">
                  <Flame className="w-3 h-3 mr-2" />
                  <span className="truncate">{lastAnalysis?.improvements?.[0] || 'Observing...'}</span>
              </div>
          </div>
      </div>
    </div>
  );
};
