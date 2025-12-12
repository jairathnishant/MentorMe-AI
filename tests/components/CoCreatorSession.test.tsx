import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';

// Mock analyzeFrame to avoid external calls
vi.mock('../../services/geminiService', () => ({
  analyzeFrame: vi.fn().mockResolvedValue({
    suggestion: 'Nice layout',
    goodPoints: ['Clear contrast'],
    improvements: ['Increase font size'],
    safetyStatus: 0,
  }),
}));

import { CoCreatorSession } from '../../components/CoCreatorSession';
import { Mentor } from '../../types';
import { analyzeFrame } from '../../services/geminiService';

describe('CoCreatorSession (screen share)', () => {
  let originalGetDisplayMedia: any;

  beforeEach(() => {
    // Ensure mediaDevices exists in JSDOM environment
    if (!navigator.mediaDevices) (navigator as any).mediaDevices = {};
    originalGetDisplayMedia = (navigator.mediaDevices as any).getDisplayMedia;
  });

  afterEach(() => {
    if (originalGetDisplayMedia) (navigator.mediaDevices as any).getDisplayMedia = originalGetDisplayMedia;
    vi.clearAllMocks();
  });

  it('starts screen share and shows video element when user accepts', async () => {
    // Mock getDisplayMedia to return a fake MediaStream
    const fakeTrack = {
      kind: 'video',
      stop: vi.fn(),
      onended: null,
    } as any;

    const fakeStream = {
      getVideoTracks: () => [fakeTrack],
      getTracks: () => [fakeTrack],
    } as any as MediaStream;

    navigator.mediaDevices.getDisplayMedia = vi.fn().mockResolvedValue(fakeStream);

    const mentor: Mentor = {
      id: 'assess_media',
      name: 'Assess video/image',
      description: '',
      context: '',
      goals: '',
      isDefault: true,
      supportedModes: ['screen'],
    };

    const onClose = vi.fn();

    const { container } = render(<CoCreatorSession mentor={mentor} userLanguage="English" onClose={onClose} />);

  // Click the Assess button (first button). There are multiple text nodes; find the one inside a button
  const matches = screen.getAllByText(/Assess video\/image/i);
  const btnNode = matches.find(n => n.closest && n.closest('button')) as Element | undefined;
  expect(btnNode).toBeDefined();
  fireEvent.click(btnNode!.closest('button')!);

    // Wait for the video element to appear
    await waitFor(() => {
      const video = container.querySelector('video');
      expect(video).toBeTruthy();
    });

    // Ensure getDisplayMedia was called
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
  });

  it('runs performAnalysis and updates suggestions', async () => {
  // Use real timers here; we'll wait for the analysis to run (initial delay ~3s)

    const fakeTrack = {
      kind: 'video',
      stop: vi.fn(),
      onended: null,
    } as any;

    const fakeStream = {
      getVideoTracks: () => [fakeTrack],
      getTracks: () => [fakeTrack],
    } as any as MediaStream;

    (navigator.mediaDevices as any).getDisplayMedia = vi.fn().mockResolvedValue(fakeStream);

    const mentor: Mentor = {
      id: 'assess_media',
      name: 'Assess video/image',
      description: '',
      context: '',
      goals: '',
      isDefault: true,
      supportedModes: ['screen'],
    };

    const onClose = vi.fn();

    const { container } = render(<CoCreatorSession mentor={mentor} userLanguage="English" onClose={onClose} />);

    // Click the Assess button
    const matches = screen.getAllByText(/Assess video\/image/i);
    const btnNode = matches.find(n => n.closest && n.closest('button')) as Element | undefined;
    fireEvent.click(btnNode!.closest('button')!);

    // Wait for the video element to be added, then set dimensions so captureFrame will run
    const video = await waitFor(() => {
      const v = container.querySelector('video');
      expect(v).toBeTruthy();
      return v as HTMLVideoElement;
    });
    if (video) {
      // JSDOM doesn't populate video sizes; set them so captureFrame proceeds
      Object.defineProperty(video, 'videoWidth', { value: 800, configurable: true });
      Object.defineProperty(video, 'videoHeight', { value: 600, configurable: true });
    }

    // Stub canvas getContext and toDataURL to return a base64 frame
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    (canvas as any).getContext = () => ({ drawImage: () => {} });
    (canvas as any).toDataURL = () => 'data:image/jpeg;base64,AAA';

    // Wait (up to 7s) for analyzeFrame to be called and suggestion to appear
    await waitFor(() => {
      expect(analyzeFrame).toHaveBeenCalled();
      expect(screen.getByText(/Nice layout/i)).toBeInTheDocument();
    }, { timeout: 7000 });
  });
});
