/**
 * Tests for src/components/SocialProofCounter.tsx
 */

import { render, screen } from '@testing-library/react';
import SocialProofCounter from '@/components/SocialProofCounter';

describe('SocialProofCounter', () => {
  it('should render with "guests booked today" text', () => {
    render(<SocialProofCounter />);
    expect(screen.getByText(/guests booked today/)).toBeInTheDocument();
  });

  it('should show a count between 3 and 12', () => {
    render(<SocialProofCounter />);
    const el = screen.getByText(/guests booked today/);
    const match = el.textContent?.match(/(\d+)/);
    expect(match).toBeTruthy();
    const count = parseInt(match![1]);
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(12);
  });

  it('should render the pulsing indicator dot', () => {
    const { container } = render(<SocialProofCounter />);
    const pulseDot = container.querySelector('.animate-ping');
    expect(pulseDot).toBeInTheDocument();
  });
});
