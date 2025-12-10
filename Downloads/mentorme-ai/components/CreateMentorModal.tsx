import React, { useState, useEffect } from 'react';
import { X, Save, AlignLeft } from 'lucide-react';
import { Button } from './Button';
import { Mentor } from '../types';
import { saveMentor } from '../services/storage';

interface MentorModalProps {
  initialData?: Mentor | null;
  onClose: () => void;
  onSave: () => void;
}

const MAX_WORDS = 200;

export const CreateMentorModal: React.FC<MentorModalProps> = ({ initialData, onClose, onSave }) => {
  const [context, setContext] = useState(initialData?.context || '');
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    // Calculate word count: split by whitespace and filter out empty strings
    const count = context.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(count);
  }, [context]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (wordCount > MAX_WORDS) {
        return; // Prevent submission
    }

    const formData = new FormData(e.currentTarget);
    const supportsCamera = formData.get('mode_camera') === 'on';
    const supportsScreen = formData.get('mode_screen') === 'on';
    
    // Default to both if neither is checked (fallback)
    const modes: ('camera' | 'screen')[] = [];
    if (supportsCamera) modes.push('camera');
    if (supportsScreen) modes.push('screen');
    if (modes.length === 0) {
        modes.push('camera', 'screen'); 
    }
    
    const mentor: Mentor = {
      id: initialData?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      context: context,
      goals: formData.get('goals') as string,
      isDefault: initialData?.isDefault || false,
      supportedModes: modes
    };

    saveMentor(mentor);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <AlignLeft className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-white">
                {initialData ? `Edit ${initialData.name}` : 'Add Custom Mentor'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mentor Name</label>
            <input 
              name="name" 
              required 
              defaultValue={initialData?.name}
              placeholder="e.g., Python Coach"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Short Description</label>
            <input 
              name="description" 
              required 
              defaultValue={initialData?.description}
              placeholder="e.g., Helps with code reviews"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">
                Context (System Instruction)
                </label>
                <span className={`text-xs font-mono ${wordCount > MAX_WORDS ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    {wordCount}/{MAX_WORDS} words
                </span>
            </div>
            <textarea 
              name="context" 
              required 
              rows={5}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe exactly how the AI should behave. E.g., 'You are a strict coding interviewer focusing on time complexity...'"
              className={`w-full bg-gray-900 border rounded-lg px-4 py-2 text-white outline-none resize-none transition-colors ${
                wordCount > MAX_WORDS 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-700 focus:ring-primary'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
                Define the persona. Be specific but concise. This controls the AI's behavior.
            </p>
            {wordCount > MAX_WORDS && (
                <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">
                    Please reduce the text to under 200 words to continue.
                </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Goals (What to monitor)
            </label>
            <textarea 
              name="goals" 
              required 
              rows={3}
              defaultValue={initialData?.goals}
              placeholder="e.g., Detect syntax errors, screen distractions, and typing posture."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none resize-none" 
            />
          </div>

          {/* Supported Modes Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Available In
            </label>
            <div className="flex space-x-6">
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="mode_camera" 
                        defaultChecked={!initialData || initialData.supportedModes?.includes('camera')} 
                        className="w-4 h-4 text-primary bg-gray-800 border-gray-600 rounded focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-300">Camera Session</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="mode_screen" 
                        defaultChecked={!initialData || initialData.supportedModes?.includes('screen')} 
                        className="w-4 h-4 text-primary bg-gray-800 border-gray-600 rounded focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-300">Screen Share</span>
                </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={wordCount > MAX_WORDS}>
              <Save className="w-4 h-4 mr-2" /> {initialData ? 'Save Changes' : 'Create Mentor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};