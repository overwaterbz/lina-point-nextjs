/**
 * Tests for src/components/TestimonialsCarousel.tsx
 */

import { render, screen, act } from '@testing-library/react';
import TestimonialsCarousel from '@/components/TestimonialsCarousel';

describe('TestimonialsCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the section heading', () => {
    render(<TestimonialsCarousel />);
    expect(screen.getByText('Guest Experiences')).toBeInTheDocument();
    expect(screen.getByText('What our guests are saying')).toBeInTheDocument();
  });

  it('should render exactly 5 dot navigation buttons', () => {
    render(<TestimonialsCarousel />);
    const dots = screen.getAllByRole('button', { name: /Show testimonial/ });
    expect(dots).toHaveLength(5);
  });

  it('should show the first testimonial initially', () => {
    render(<TestimonialsCarousel />);
    expect(screen.getByText(/Sarah M\./)).toBeInTheDocument();
    expect(screen.getByText(/Austin, TX/)).toBeInTheDocument();
  });

  it('should auto-rotate to next testimonial after 6 seconds', () => {
    render(<TestimonialsCarousel />);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // After rotation, James & Laura K. should be the active (opacity-100) testimonial
    const jamesEl = screen.getByText(/James & Laura K\./);
    expect(jamesEl).toBeInTheDocument();
  });

  it('should navigate when a dot is clicked', () => {
    render(<TestimonialsCarousel />);
    const dots = screen.getAllByRole('button', { name: /Show testimonial/ });

    act(() => {
      dots[2].click(); // Third testimonial
    });

    expect(screen.getByText(/Maria C\./)).toBeInTheDocument();
  });

  it('should wrap around after the last testimonial', () => {
    render(<TestimonialsCarousel />);

    // Advance through all 5 testimonials (5 * 6s = 30s), should be back to first
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/Sarah M\./)).toBeInTheDocument();
  });
});
