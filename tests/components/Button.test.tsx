import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../../components/Button';
import { describe, it, expect } from 'vitest';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    // Tailwind spinner SVG presence check
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-danger');
  });
});