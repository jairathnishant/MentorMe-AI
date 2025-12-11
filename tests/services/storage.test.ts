import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveUser, checkUserExists, loginUser, saveReportMetadata, getReportsMetadata, getUser } from '../../services/storage';
import { User, SessionReport } from '../../types';

describe('Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and retrieve a user', () => {
    const user: User = {
      id: '123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@gmail.com',
      language: 'English',
      consentGiven: true,
      joinedAt: Date.now(),
    };

    saveUser(user);
    expect(checkUserExists('test@gmail.com')).toBe(true);
    
    const retrieved = loginUser('test@gmail.com');
    expect(retrieved).toEqual(user);
    expect(getUser()).toEqual(user);
  });

  it('should limit reports to 5 per user', async () => {
    const user: User = {
        id: 'user1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@gmail.com',
        language: 'English',
        consentGiven: true,
        joinedAt: Date.now(),
    };
    saveUser(user);

    // Create 6 reports
    for (let i = 0; i < 6; i++) {
        const report: SessionReport = {
            id: `rep${i}`,
            userId: 'user1',
            startTime: Date.now(),
            endTime: Date.now(),
            durationSeconds: 60,
            activityType: 'Test',
            overallScore: 80,
            keyInsights: [],
            timeline: [],
            isFlagged: false,
            videoBlobKey: `blob${i}`
        };
        await saveReportMetadata(report);
    }

    const reports = getReportsMetadata();
    expect(reports.length).toBe(5);
    // Should contain rep5 (newest) and NOT rep0 (oldest)
    expect(reports[0].id).toBe('rep5'); 
    expect(reports.find(r => r.id === 'rep0')).toBeUndefined();
  });
});