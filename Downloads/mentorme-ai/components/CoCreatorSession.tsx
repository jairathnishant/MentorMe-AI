
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Monitor, X, Zap, AlertTriangle, Eye, ArrowRight, AppWindow, Layout, Volume2, VolumeX, CheckCircle, Flame, Users } from 'lucide-react';
import { Button } from './Button';
import { AnalysisPoint, SafetyStatus, Mentor } from '../types';
import { analyzeFrame } from '../services/geminiService';

interface CoCreatorSessionProps {
  mentor: Mentor;
  userLanguage: string;
  onClose: () => void;
}

const ANALYSIS_INTERVAL = 10000; // Analyze every 10 seconds for co-creation

export const CoCreatorSession: React.FC<CoCreatorSessionProps> = ({ mentor, userLanguage, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLive, setIsLive] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>("Ready to connect...");
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // TTS Logic with Natural Voice Selection
  useEffect(() => {
    if (!isVoiceEnabled || !currentSuggestion || !isLive) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentSuggestion);
    
    let langTag = 'en-US';
    switch (userLanguage) {
        case 'Spanish': langTag = 'es-ES'; break;
        case 'French': langTag = 'fr-FR'; break;
        default: langTag = 'en-US';
    }
    utterance.lang = langTag;

     // Smart Voice Selection: Prefer "Google", "Natural", or "Premium"
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

    // Persona-based Tone
    if (mentor.id.includes('coworker')) {
        utterance.rate = 1.05; // Professional/Efficient
        utterance.pitch = 1.0;
    } else if (mentor.id.includes('tag_team')) {
        utterance.rate = 1.2; // Energetic/Fast
        utterance.pitch = 1.1; 
    } else {
        utterance.rate = 1.1; // Default helpful AI
        utterance.pitch = 1.0;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [currentSuggestion, isVoiceEnabled, isLive, userLanguage, availableVoices, mentor.id]);

  const startScreenShare = async (preferredSurface?: 'monitor' | 'window' | 'browser') => {
    try {
      setError(null);
      
      const videoConstraints: any = {
        cursor: "always"
      };

      if (preferredSurface) {
        videoConstraints.displaySurface = preferredSurface;
      }

      const displayMediaOptions = {
          video: videoConstraints,
          audio: false 
      };
      
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Don't call play() immediately, wait for onloadedmetadata
      }
      
      setIsLive(true);
      setCurrentSuggestion(`Connected to ${mentor.name}. I'm watching your screen now.`);

      stream.getVideoTracks()[0].onended = () => {
          handleStop();
      };

    } catch (err: any) {
      console.error("Screen share error:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
         if (err.message.includes("permissions policy")) {
             setError("Screen sharing is disabled by the hosting environment. This feature requires the 'display-capture' permission.");
         } else {
             setError("Permission denied or cancelled. Please try again.");
         }
      } else {
         setError("Could not start screen share. Please check browser permissions.");
      }
    }
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Downscale for performance/API limits
    const MAX_WIDTH = 1024;
    const scale = Math.min(1, MAX_WIDTH / canvas.width);
    if (scale < 1) {
       canvas.width = canvas.width * scale;
       canvas.height = canvas.height * scale;
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
       ctx.drawImage(video, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.5).split(',')[1]; 
  }, []);

  const performAnalysis = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      setIsAnalyzing(true);
      const point = await analyzeFrame(frame, mentor, userLanguage);
      setIsAnalyzing(false);
      
      if (point.safetyStatus === SafetyStatus.UNSAFE) {
        handleStop();
        setError("SAFETY ALERT: The AI detected unsafe content on your screen. Session terminated.");
        return;
      }

      setLastAnalysis(point);
      setCurrentSuggestion(point.suggestion);
    } catch (err) {
      console.error("Co-creation analysis failed", err);
      setIsAnalyzing(false);
      setCurrentSuggestion("Re-calibrating visual feed...");
    }
  }, [captureFrame, mentor, userLanguage]);

  useEffect(() => {
    if (!isLive) return;
    const timeout = setTimeout(performAnalysis, 3000); 
    const interval = setInterval(performAnalysis, ANALYSIS_INTERVAL);
    return () => {
        clearInterval(interval);
        clearTimeout(timeout);
    };
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
                <h3 className="font-bold text-white text-sm">Screen Share: {mentor.name}</h3>
                <p className="text-xs text-gray-400">Edge Computing Mode • No Recording Stored</p>
            </div>
         </div>
         <div className="flex items-center space-x-2">
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
      <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-24 bg-black relative">
         {!isLive ? (
             <div className="text-center p-8 max-w-lg w-full">
                 <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Monitor className="w-10 h-10 text-gray-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Share Source</h2>
                 <p className="text-gray-400 mb-8">
                    Select the screen or window for the <span className="text-primary">{mentor.name}</span> to analyze.
                 </p>
                 
                 <div className="grid grid-cols-1 gap-3 w-full">
                    <Button onClick={() => startScreenShare('monitor')} size="lg" className="w-full justify-between group h-14 bg-gray-800 hover:bg-gray-700 border-gray-700">
                        <span className="flex items-center"><Monitor className="w-5 h-5 mr-3 text-purple-500" /> Assess video/image</span>
                        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </Button>
                    <Button onClick={() => startScreenShare('monitor')} size="lg" className="w-full justify-between group h-14 bg-gray-800 hover:bg-gray-700 border-gray-700">
                         <span className="flex items-center"><Users className="w-5 h-5 mr-3 text-blue-500" /> Co-Worker</span>
                         <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </Button>
                    <Button onClick={() => startScreenShare('monitor')} size="lg" className="w-full justify-between group h-14 bg-gray-800 hover:bg-gray-700 border-gray-700">
                         <span className="flex items-center"><Flame className="w-5 h-5 mr-3 text-red-500" /> Tag-Team Player</span>
                         <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </Button>
                 </div>
             </div>
         ) : (
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                    e.currentTarget.play();
                }}
                className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-700"
            />
         )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Ticker Chat at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-md border-t border-gray-800 flex items-center overflow-hidden z-20">
          <div className="flex-shrink-0 px-6 bg-black h-full flex items-center z-10 border-r border-gray-800">
              <div className="flex flex-col w-24">
                  <span className="text-xs text-primary font-bold uppercase tracking-wider">Mentor Stream</span>
                  {isAnalyzing && <span className="text-[10px] text-yellow-500 animate-pulse">Thinking...</span>}
                  {!isAnalyzing && <span className="text-[10px] text-green-500">Live</span>}
              </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
             <div className="whitespace-nowrap animate-marquee text-lg text-white font-medium">
                 {currentSuggestion}
             </div>
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
