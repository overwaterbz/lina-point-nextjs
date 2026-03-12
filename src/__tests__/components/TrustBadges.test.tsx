/**
 * Tests for src/components/TrustBadges.tsx
 */

import { render, screen } from '@testing-library/react';
import TrustBadges from '@/components/TrustBadges';

describe('TrustBadges', () => {
  it('should render all 3 trust badges', () => {
    render(<TrustBadges />);
    expect(screen.getByText('Best Price Guarantee')).toBeInTheDocument();
    expect(screen.getByText('Secure Payments')).toBeInTheDocument();
    expect(screen.getByText('24/7 WhatsApp Support')).toBeInTheDocument();
  });

  it('should show badge descriptions', () => {
    render(<TrustBadges />);
    expect(screen.getByText(/6% below any OTA/)).toBeInTheDocument();
    expect(screen.getByText(/Stripe & Square encrypted/)).toBeInTheDocument();
    expect(screen.getByText(/AI concierge \+ human team/)).toBeInTheDocument();
  });

  it('should render 3 badge containers', () => {
    const { container } = render(<TrustBadges />);
    const badges = container.querySelectorAll('.bg-white\\/80');
    expect(badges).toHaveLength(3);
  });
});
