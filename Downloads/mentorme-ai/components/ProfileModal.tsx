
import React from 'react';
import { X, Save, User as UserIcon, Globe } from 'lucide-react';
import { Button } from './Button';
import { User } from '../types';
import { saveUser } from '../services/storage';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onSave }) => {

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updatedUser: User = {
      ...user,
      firstName: formData.get('firstName') as string,
      lastName: (formData.get('lastName') as string) || '',
      language: formData.get('language') as string,
    };

    saveUser(updatedUser);
    onSave(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center space-x-2">
            <UserIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-white">Your Profile</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
          <div className="flex flex-col items-center mb-4">
               <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white shadow-xl mb-2">
                    {user.firstName.charAt(0)}{user.lastName ? user.lastName.charAt(0) : ''}
               </div>
               <p className="text-gray-400">{user.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                 <label className="block text-xs font-medium text-gray-400 mb-1">First Name <span className="text-red-500">*</span></label>
                 <input name="firstName" defaultValue={user.firstName} required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-primary outline-none" />
             </div>
             <div>
                 <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
                 <input name="lastName" defaultValue={user.lastName} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-primary outline-none" placeholder="Optional" />
             </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
             <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center">
                 <Globe className="w-4 h-4 mr-1" /> Preferences
             </h3>
             <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Preferred Language <span className="text-red-500">*</span></label>
                <select name="language" defaultValue={user.language} required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-primary outline-none">
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                </select>
             </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
