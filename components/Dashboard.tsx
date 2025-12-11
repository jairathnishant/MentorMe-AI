
import React, { useState, useEffect } from 'react';
import { FileText, Share2, Plus, Monitor, Camera, Trash2, LayoutGrid, Mic, Shirt, Activity, Code, Video, Settings2, ArrowLeft, ArrowRight, Image as ImageIcon, Users, Swords } from 'lucide-react';
import { Button } from './Button';
import { SessionReport, User, Mentor } from '../types';
import { getReportsMetadata, getMentors, deleteMentor } from '../services/storage';
import { CreateMentorModal } from './CreateMentorModal';

interface DashboardProps {
  user: User;
  onStartSession: (mentor: Mentor, mode: 'camera' | 'screen') => void;
  onViewReport: (report: SessionReport) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onStartSession, onViewReport }) => {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  
  // New State for Selection Flow
  const [selectedMode, setSelectedMode] = useState<'camera' | 'screen' | null>(null);

  const loadData = () => {
    setReports(getReportsMetadata());
    setMentors(getMentors());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteMentor = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this mentor? Default mentors will reset to original settings.")) {
        deleteMentor(id);
        loadData();
    }
  };

  const handleEditMentor = (e: React.MouseEvent, mentor: Mentor) => {
    e.stopPropagation();
    setEditingMentor(mentor);
    setIsModalOpen(true);
  };

  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    // Camera Icons
    if (lower.includes('yoga')) return <Activity className="w-24 h-24 text-secondary" />;
    if (lower.includes('debat')) return <Mic className="w-24 h-24 text-primary" />;
    if (lower.includes('fashion')) return <Shirt className="w-24 h-24 text-pink-500" />;
    
    // Screen Icons
    if (lower.includes('assess')) return <ImageIcon className="w-24 h-24 text-purple-500" />;
    if (lower.includes('worker') || lower.includes('co-worker')) return <Users className="w-24 h-24 text-blue-500" />;
    if (lower.includes('tag-team') || lower.includes('tag team')) return <Swords className="w-24 h-24 text-red-500" />;
    
    // Fallbacks
    if (lower.includes('work')) return <LayoutGrid className="w-24 h-24 text-primary" />;
    if (lower.includes('code') || lower.includes('dev')) return <Code className="w-24 h-24 text-green-500" />;
    return <Video className="w-24 h-24 text-gray-500" />;
  };

  // Filter mentors based on selected mode
  const displayedMentors = mentors.filter(m => {
      if (!selectedMode) return false;
      // If supportedModes is undefined (old custom mentor), show in both or default to camera?
      // Let's assume custom mentors show up in both unless specified.
      if (!m.supportedModes) return true;
      return m.supportedModes.includes(selectedMode);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {user.firstName}</h1>
          <p className="text-gray-400 mt-1">
            {selectedMode 
                ? `Select a mentor for your ${selectedMode === 'camera' ? 'Camera' : 'Screen Share'} session.` 
                : 'How would you like to be mentored today?'}
          </p>
        </div>
        <div className="flex space-x-2">
            {/* removed drive connected badge */}
        </div>
      </div>

      {/* STEP 1: MODE SELECTION */}
      {!selectedMode && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <button 
                onClick={() => setSelectedMode('camera')}
                className="group relative h-64 bg-card rounded-2xl border border-gray-800 hover:border-primary transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Camera Session</h2>
                <p className="text-gray-400 max-w-sm">
                    Allow MentorMe to analyze your posture, environment, and activities via your webcam.
                </p>
                <div className="mt-6 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Camera <ArrowRight className="w-4 h-4 ml-1" />
                </div>
            </button>

            <button 
                onClick={() => setSelectedMode('screen')}
                className="group relative h-64 bg-card rounded-2xl border border-gray-800 hover:border-secondary transition-all overflow-hidden flex flex-col items-center justify-center p-8 text-center"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Monitor className="w-10 h-10 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Screen Share</h2>
                <p className="text-gray-400 max-w-sm">
                    Share your screen for real-time edge analysis of your workflow, coding, or gaming.
                </p>
                <div className="mt-6 flex items-center text-secondary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Sharing <ArrowRight className="w-4 h-4 ml-1" />
                </div>
            </button>
         </div>
      )}

      {/* STEP 2: MENTOR SELECTION */}
      {selectedMode && (
        <div className="animate-fade-in">
            <Button onClick={() => setSelectedMode(null)} variant="ghost" className="mb-6 pl-0 hover:bg-transparent text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modes
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {displayedMentors.map((mentor) => (
                    <div key={mentor.id} onClick={() => onStartSession(mentor, selectedMode)} className="cursor-pointer bg-card p-6 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all shadow-lg relative overflow-hidden group flex flex-col h-full hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            {getIcon(mentor.name)}
                        </div>
                        
                        <div className="flex-1 relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white pr-8">{mentor.name}</h3>
                                <div className="flex space-x-1 absolute right-0 top-0">
                                    <button 
                                        onClick={(e) => handleEditMentor(e, mentor)} 
                                        className="p-1 text-gray-500 hover:text-primary transition-colors bg-gray-900/50 rounded-md z-20"
                                        title="Edit Context"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </button>
                                    {!mentor.isDefault && (
                                        <button 
                                            onClick={(e) => handleDeleteMentor(e, mentor.id)} 
                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors bg-gray-900/50 rounded-md z-20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm mb-6 line-clamp-3 min-h-[60px]">{mentor.description}</p>
                        </div>

                        <div className="space-y-2 mt-auto relative z-10">
                            <div className={`w-full py-2 px-4 rounded-lg flex items-center justify-center font-medium transition-colors ${selectedMode === 'camera' ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white'}`}>
                                {selectedMode === 'camera' ? <Camera className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
                                Start {selectedMode === 'camera' ? 'Camera' : 'Screen'} Session
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Mentor Card */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingMentor(null); setIsModalOpen(true); }}
                    className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 border-dashed hover:border-primary hover:bg-gray-900 transition-all flex flex-col items-center justify-center text-center h-full min-h-[200px] group"
                >
                    <div className="w-16 h-16 rounded-full bg-gray-800 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                        <Plus className="w-8 h-8 text-gray-400 group-hover:text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300">Add Custom Mentor</h3>
                    <p className="text-gray-500 text-sm mt-2">Create a personalized persona.</p>
                </button>
            </div>
        </div>
      )}

      {/* Reports Section (Always Visible) */}
      <div className="mb-6 border-b border-gray-800">
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('reports')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Recent Reports (Stored for 15 Days)
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-card/30 rounded-xl border border-gray-800 border-dashed">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No reports yet</h3>
            <p className="text-gray-600">Complete a camera session to see your analytics.</p>
        </div>
      ) : (
        <div className="space-y-4">
            {reports.map((report) => (
                <div key={report.id} className="bg-card p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row items-center justify-between hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center space-x-4 w-full md:w-auto mb-4 md:mb-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${report.overallScore > 80 ? 'bg-green-500/20 text-green-500' : report.overallScore > 50 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                            <span className="font-bold">{report.overallScore}</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-white capitalize">{report.activityType}</h4>
                            <div className="flex items-center text-xs text-gray-500 space-x-2">
                                <span>{new Date(report.startTime).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{new Date(report.startTime).toLocaleTimeString()}</span>
                                <span>•</span>
                                <span>{Math.floor(report.durationSeconds / 60)}m {Math.floor(report.durationSeconds % 60)}s</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                            const text = `MentorMe Report - ${report.activityType}\nScore: ${report.overallScore}\n\nInsights:\n${report.keyInsights.join('\n')}`;
                            const url = `mailto:?subject=My MentorMe Report&body=${encodeURIComponent(text)}`;
                            window.location.href = url;
                        }}>
                             <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => onViewReport(report)}>
                            View Analysis
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {isModalOpen && (
        <CreateMentorModal 
            initialData={editingMentor}
            onClose={() => { setIsModalOpen(false); setEditingMentor(null); }} 
            onSave={() => { setIsModalOpen(false); setEditingMentor(null); loadData(); }} 
        />
      )}
    </div>
  );
};