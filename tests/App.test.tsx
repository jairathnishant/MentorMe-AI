import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { describe, it, expect, beforeEach } from 'vitest';

describe('App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders onboarding screen initially', () => {
    render(<App />);
    expect(screen.getByText(/MentorMe AI/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@gmail.com')).toBeInTheDocument();
  });

  it('allows user to sign up flow', async () => {
    render(<App />);

    // Step 1: Email
    const emailInput = screen.getByPlaceholderText('example@gmail.com');
    fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } });
    fireEvent.click(screen.getByText('Continue'));

    // Step 2: OTP
    expect(await screen.findByText(/Verification Code/i)).toBeInTheDocument();
    const otpInput = screen.getByPlaceholderText('123456');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Login'));

    // Step 3: Profile
    expect(await screen.findByText(/Complete Profile/i)).toBeInTheDocument();
    
    // Fill required fields
    const nameInput = screen.getByPlaceholderText('Jane'); // First name placeholder
    fireEvent.change(nameInput, { target: { value: 'Tester' } });
    
    // Language is pre-selected or required
    
    fireEvent.click(screen.getByText('I Agree & Create Profile'));

    // Dashboard
    expect(await screen.findByText(/Welcome back, Tester/i)).toBeInTheDocument();
  });
});