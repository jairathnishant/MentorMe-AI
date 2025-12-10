
import React, { useState, useEffect } from 'react';
import { User, SessionReport, ViewState, Mentor } from './types';
import { Dashboard } from './components/Dashboard';
import { SessionRecorder } from './components/SessionRecorder';
import { CoCreatorSession } from './components/CoCreatorSession';
import { ReportView } from './components/ReportView';
import { ProfileModal } from './components/ProfileModal';
import { Button } from './components/Button';
import { saveUser, getUser, checkUserExists, loginUser, logoutUser } from './services/storage';
import { ShieldCheck, Video, Lock, Mail, KeyRound, UserCircle, LogOut, AlertCircle } from 'lucide-react';

type AuthStep = 'email' | 'otp' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('onboarding');
  const [activeMentor, setActiveMentor] = useState<Mentor | null>(null);
  const [currentReport, setCurrentReport] = useState<SessionReport | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Auth State
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpError, setOtpError] = useState('');

  // Load user on mount
  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
      setView('dashboard');
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();

    if (!email.endsWith('@gmail.com')) {
        alert('Please use a valid @gmail.com address');
        return;
    }

    setPendingEmail(email);
    setAuthStep('otp');
    setOtpError('');
  };

  const handleOtpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const otp = formData.get('otp') as string;

    // Simulated 6-digit OTP check (Accept '123456' for demo)
    if (otp !== '123456') {
        setOtpError('Invalid code. Please try again (Use 123456 for demo).');
        return;
    }

    // Check if user exists
    if (checkUserExists(pendingEmail)) {
        const existingUser = loginUser(pendingEmail);
        setUser(existingUser);
        setView('dashboard');
    } else {
        setAuthStep('profile');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newUser: User = {
      id: crypto.randomUUID(),
      firstName: formData.get('firstName') as string,
      lastName: (formData.get('lastName') as string) || '',
      email: pendingEmail,
      language: formData.get('language') as string,
      consentGiven: true,
      joinedAt: Date.now()
    };
    
    saveUser(newUser);
    setUser(newUser);
    setView('dashboard');
  };

  const handleLogout = () => {
      logoutUser();
      setUser(null);
      setView('onboarding');
      setAuthStep('email');
      setPendingEmail('');
  };

  const startSession = (mentor: Mentor, mode: 'camera' | 'screen') => {
    setActiveMentor(mentor);
    if (mode === 'camera') {
      setView('recording');
    } else {
      setView('co-creating');
    }
  };

  const handleSessionComplete = (report: SessionReport) => {
    setCurrentReport(report);
    setView('report');
  };

  const handleSessionCancel = () => {
    setView('dashboard');
    setActiveMentor(null);
  };

  const renderAuth = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark to-slate-900">
            <div className="bg-card border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">MentorMe AI</h1>
                <p className="text-gray-400">Your intelligent personal coach.</p>
              </div>

              {authStep === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sign in with Gmail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input 
                                type="email" 
                                name="email" 
                                required 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                                placeholder="example@gmail.com"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg">Continue</Button>
                  </form>
              )}

              {authStep === 'otp' && (
                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-400 mb-4">
                            We've sent a 6-digit code to <span className="text-white">{pendingEmail}</span>.
                            <br/>(Use <span className="font-mono text-primary">123456</span> for demo)
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Verification Code</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input 
                                type="text" 
                                name="otp" 
                                required 
                                maxLength={6}
                                pattern="\d{6}"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none tracking-widest text-center text-lg" 
                                placeholder="123456"
                            />
                        </div>
                        {otpError && <p className="text-red-500 text-xs mt-2 text-center">{otpError}</p>}
                    </div>
                    <Button type="submit" className="w-full" size="lg">Verify & Login</Button>
                    <button type="button" onClick={() => setAuthStep('email')} className="w-full text-center text-sm text-gray-500 hover:text-white mt-2">
                        Change Email
                    </button>
                  </form>
              )}

              {authStep === 'profile' && (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                     <h2 className="text-xl font-bold text-white text-center">Complete Profile</h2>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">First Name <span className="text-red-500">*</span></label>
                            <input name="firstName" required className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-primary outline-none" placeholder="Jane" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
                            <input name="lastName" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-primary outline-none" placeholder="Doe (Optional)" />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Language <span className="text-red-500">*</span></label>
                        <select name="language" required className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:ring-primary outline-none">
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                        </select>
                     </div>

                     <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 mt-2 space-y-3">
                        <div className="flex items-start">
                           <ShieldCheck className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                           <p className="text-[10px] text-gray-400 leading-tight">
                             I consent to MentorMe analyzing my video feed/screen to provide feedback. I understand data is processed locally where possible and flagged for toxicity.
                           </p>
                        </div>
                        <div className="flex items-start">
                           <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                           <p className="text-[10px] text-gray-400 leading-tight">
                             <strong>Disclaimer:</strong> The AI-generated advice is for informational purposes only and can make mistakes. All suggestions (especially regarding health, posture, or professional tasks) should be ratified by a human expert. Use at your own discretion.
                           </p>
                        </div>
                     </div>

                     <Button type="submit" className="w-full" size="lg">I Agree & Create Profile</Button>
                  </form>
              )}
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'onboarding':
        return renderAuth();

      case 'dashboard':
        return user ? (
            <Dashboard 
                user={user} 
                onStartSession={startSession} 
                onViewReport={(r) => { setCurrentReport(r); setView('report'); }} 
            />
        ) : null;

      case 'recording':
        return user && activeMentor ? (
            <SessionRecorder 
                mentor={activeMentor} 
                userId={user.id} 
                userLanguage={user.language}
                onComplete={handleSessionComplete} 
                onCancel={handleSessionCancel}
            />
        ) : null;

      case 'co-creating':
        return user && activeMentor ? (
            <CoCreatorSession
                mentor={activeMentor}
                userLanguage={user.language}
                onClose={handleSessionCancel}
            />
        ) : null;

      case 'report':
        return currentReport ? (
            <ReportView 
                report={currentReport} 
                onBack={() => setView('dashboard')} 
            />
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white font-sans selection:bg-primary/30">
        {user && view !== 'onboarding' && view !== 'recording' && view !== 'co-creating' && (
            <header className="h-16 border-b border-gray-800 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('dashboard')}>
                        <Video className="w-6 h-6 text-primary" />
                        <span className="font-bold text-lg hidden sm:block">MentorMe AI</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-xs text-gray-400 hidden sm:flex">
                            <Lock className="w-3 h-3 mr-1" />
                            Secure Session
                        </div>
                        <div className="relative group">
                            <button 
                                onClick={() => setIsProfileOpen(true)}
                                className="flex items-center space-x-3 bg-gray-900 hover:bg-gray-800 transition-colors py-1.5 px-3 rounded-full border border-gray-800"
                            >
                                <span className="text-sm font-medium text-white">{user.firstName}</span>
                                <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                    {user.firstName.charAt(0)}{user.lastName ? user.lastName.charAt(0) : ''}
                                </div>
                            </button>
                        </div>
                        <button onClick={handleLogout} className="text-gray-500 hover:text-white" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>
        )}
        <main className={(view === 'recording' || view === 'co-creating') ? 'h-screen' : ''}>
            {renderContent()}
        </main>

        {isProfileOpen && user && (
            <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onSave={(u) => { setUser(u); setIsProfileOpen(false); }} />
        )}
    </div>
  );
}
