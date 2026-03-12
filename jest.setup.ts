// jest.setup.ts - Jest test environment setup

import '@testing-library/jest-dom';

// Mock environment variables by default
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.GROK_API_KEY = 'test-grok-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID = 'sandbox-sq-123';
process.env.CRON_SECRET = 'test-cron-secret-value';
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
process.env.TWILIO_ACCOUNT_SID = 'test-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';
// NODE_ENV is set by Jest automatically

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs in tests (use only errors/warnings)
  log: jest.fn(),
  debug: jest.fn(),
};

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

// Performance monitoring
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});
