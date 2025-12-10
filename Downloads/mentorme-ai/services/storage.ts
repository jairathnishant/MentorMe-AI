
import { SessionReport, Mentor, User } from '../types';

const DB_NAME = 'MentorMeDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

// IndexedDB Helper for Large Files (Videos)
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE);
      }
    };
  });
};

export const saveVideoBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.put(blob, id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getVideoBlob = async (id: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const deleteVideoBlob = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// LocalStorage for Metadata
const REPORTS_KEY = 'mentor_me_reports';
const CURRENT_USER_EMAIL_KEY = 'mentor_me_current_email';
const USERS_DB_KEY = 'mentor_me_users_db'; // Stores Record<email, User>
const MENTORS_KEY = 'mentor_me_mentors';

// User Management (Simulated DB)
const getUsersDB = (): Record<string, User> => {
    const data = localStorage.getItem(USERS_DB_KEY);
    return data ? JSON.parse(data) : {};
};

export const checkUserExists = (email: string): boolean => {
    const db = getUsersDB();
    return !!db[email];
};

export const saveUser = (user: User) => {
  const db = getUsersDB();
  db[user.email] = user;
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
  localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
};

export const loginUser = (email: string): User | null => {
    const db = getUsersDB();
    if (db[email]) {
        localStorage.setItem(CURRENT_USER_EMAIL_KEY, email);
        return db[email];
    }
    return null;
};

export const getUser = (): User | null => {
  const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
  if (!email) return null;
  const db = getUsersDB();
  return db[email] || null;
};

export const logoutUser = () => {
    localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
};

// Reports
export const saveReportMetadata = async (report: SessionReport) => {
  let reports = getReportsMetadata();
  reports.unshift(report);
  
  // Enforce 5 video limit (FIFO)
  if (reports.length > 5) {
      const reportsToRemove = reports.slice(5);
      reports = reports.slice(0, 5);
      
      // Cleanup video blobs for removed reports
      for (const r of reportsToRemove) {
          if (r.videoBlobKey) {
              try {
                  await deleteVideoBlob(r.videoBlobKey);
              } catch (e) {
                  console.warn(`Failed to delete video blob for report ${r.id}`, e);
              }
          }
      }
  }
  
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export const getReportsMetadata = (): SessionReport[] => {
  const data = localStorage.getItem(REPORTS_KEY);
  const allReports: SessionReport[] = data ? JSON.parse(data) : [];
  
  // Filter by current logged in user
  const currentUser = getUser();
  if (!currentUser) return [];

  return allReports.filter(r => r.userId === currentUser.id);
};

// Mentor Management
const DEFAULT_MENTORS: Mentor[] = [
  // --- CAMERA MENTORS ---
  {
    id: 'yoga',
    name: 'Yoga Teacher',
    description: 'Monitor yoga poses, alignment, and breathing pace.',
    context: 'You are an expert yoga instructor. Analyze the user\'s poses for safe alignment, balance, and breathing. Provide gentle, encouraging corrections.',
    goals: 'Correct spine alignment, balance, posture stability, breathing rhythm.',
    isDefault: true,
    supportedModes: ['camera']
  },
  {
    id: 'debate',
    name: 'Debating Coach',
    description: 'Analyze speech delivery, hand gestures, and confidence.',
    context: 'You are a world-class debating coach. Analyze the user\'s body language, hand gestures, eye contact, and confidence levels while they speak.',
    goals: 'Improve hand gestures, maintain eye contact, reduce nervous ticks, confident posture.',
    isDefault: true,
    supportedModes: ['camera']
  },
  {
    id: 'fashion',
    name: 'Fashion Designer',
    description: 'Get feedback on your outfit, color coordination, and style.',
    context: 'You are a high-end fashion designer and personal stylist. Critique the user\'s outfit choice, color coordination, and overall aesthetic.',
    goals: 'Color matching, outfit fit, accessories, style cohesiveness.',
    isDefault: true,
    supportedModes: ['camera']
  },

  // --- SCREEN SHARE MENTORS ---
  {
    id: 'assess_media',
    name: 'Assess video/image',
    description: 'Feedback on visuals, video edits, designs, or art.',
    context: 'You are a creative director and visual critic. Analyze the image or video content on screen. Comment on composition, color grading, pacing (if video), and visual impact.',
    goals: 'Visual composition, color harmony, editing flow, design aesthetics.',
    isDefault: true,
    supportedModes: ['screen']
  },
  {
    id: 'coworker',
    name: 'Co-Worker',
    description: 'Professional pair programming or document review partner.',
    context: 'You are a senior colleague and helpful co-worker. Review the code, document, or email on screen. Look for errors, clarity issues, or logical gaps. Be professional and constructive.',
    goals: 'Code quality, syntax errors, document clarity, professional tone, formatting.',
    isDefault: true,
    supportedModes: ['screen']
  },
  {
    id: 'tag_team',
    name: 'Tag-Team player',
    description: 'High-energy companion for gaming or intense workflows.',
    context: 'You are an energetic, hype-man style teammate. Watch the gameplay or fast-paced workflow. Call out critical information, cheer for wins, and suggest strategic moves.',
    goals: 'Map awareness, resource management, reaction time, strategy, morale boosting.',
    isDefault: true,
    supportedModes: ['screen']
  }
];

export const getMentors = (): Mentor[] => {
  const stored = localStorage.getItem(MENTORS_KEY);
  const customMentors: Mentor[] = stored ? JSON.parse(stored) : [];
  
  const customMap = new Map(customMentors.map(m => [m.id, m]));
  
  const mergedDefaults = DEFAULT_MENTORS.map(dm => {
    return customMap.has(dm.id) ? customMap.get(dm.id)! : dm;
  });

  const pureCustoms = customMentors.filter(cm => !DEFAULT_MENTORS.some(dm => dm.id === cm.id));

  return [...mergedDefaults, ...pureCustoms];
};

export const saveMentor = (mentor: Mentor) => {
  const stored = localStorage.getItem(MENTORS_KEY);
  let customMentors: Mentor[] = stored ? JSON.parse(stored) : [];
  
  const index = customMentors.findIndex(m => m.id === mentor.id);
  if (index >= 0) {
    customMentors[index] = mentor;
  } else {
    customMentors.push(mentor);
  }
  
  localStorage.setItem(MENTORS_KEY, JSON.stringify(customMentors));
};

export const deleteMentor = (id: string) => {
    const stored = localStorage.getItem(MENTORS_KEY);
    if(!stored) return;
    
    let customMentors = JSON.parse(stored) as Mentor[];
    
    const isDefault = DEFAULT_MENTORS.some(dm => dm.id === id);
    
    if (isDefault) {
        // Just remove the override
        customMentors = customMentors.filter(m => m.id !== id);
    } else {
        // Remove the mentor
        customMentors = customMentors.filter(m => m.id !== id);
    }
    
    localStorage.setItem(MENTORS_KEY, JSON.stringify(customMentors));
};
