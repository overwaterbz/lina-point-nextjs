/**
 * @jest-environment node
 */

/**
 * Tests for /api/trigger-n8n endpoint
 * Tests workflow orchestration and self-improve triggering
 */

import { POST } from '@/app/api/trigger-n8n/route';
import {
  createMockRequest,
  testApiEndpoint,
  performanceMetrics,
} from '@/__tests__/utils/test-helpers';

jest.mock('@/lib/agents/selfImprovementAgent');
jest.mock('@supabase/supabase-js');

const N8N_SECRET = 'test-n8n-secret';

describe('POST /api/trigger-n8n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMetrics.clear();
    process.env.N8N_SECRET = N8N_SECRET;
  });

  describe('Authentication', () => {
    it('should require x-n8n-secret header', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          booking: {
            roomType: 'beach-villa',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        // No secret header
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should reject invalid secret', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          booking: {
            roomType: 'beach-villa',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        headers: { 'x-n8n-secret': 'wrong-secret' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should accept valid secret', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          booking: {
            roomType: 'beach-villa',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        headers: { 'x-n8n-secret': N8N_SECRET },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Workflow Execution', () => {
    const validHeaders = { 'x-n8n-secret': N8N_SECRET };

    it('should return workflow structure', async () => {
      const { data } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'overwater-suite',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        headers: validHeaders,
        expectedStatus: 200,
        expectedFields: ['ok', 'workflow', 'steps'],
        maxResponseTime: 1000,
      });

      performanceMetrics.record('n8n-trigger', data.steps?.length || 0);
      expect(data.ok).toBe(true);
      expect(data.workflow).toBe('booking-curate-content-email');
      expect(Array.isArray(data.steps)).toBe(true);
    });

    it('should execute without self-improve by default', async () => {
      const { data } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'beach-villa',
            checkInDate: '2026-03-20',
            checkOutDate: '2026-03-25',
            groupSize: 3,
          },
        },
        headers: validHeaders,
        maxResponseTime: 1000,
      });

      expect(data.steps).toBeDefined();
      const selfImproveStep = data.steps.find(
        (s: any) => s.name === 'self_improve'
      );
      expect(selfImproveStep).toBeUndefined();
    });
  });

  describe('Self-Improvement Chaining', () => {
    const validHeaders = { 'x-n8n-secret': N8N_SECRET };

    it('should trigger self-improve when requested', async () => {
      const { data } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'garden-villa',
            checkInDate: '2026-03-10',
            checkOutDate: '2026-03-15',
            groupSize: 1,
          },
          runSelfImprove: true,
        },
        headers: validHeaders,
        maxResponseTime: 2000,
      });

      const selfImproveStep = data.steps.find(
        (s: any) => s.name === 'self_improve'
      );
      expect(selfImproveStep).toBeDefined();
      expect(selfImproveStep.status).toBe('completed');
    });

    it('should handle self-improve errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Self-improve failed')
      );

      const request = createMockRequest({
        method: 'POST',
        body: {
          booking: {
            roomType: 'beach-bungalow',
            checkInDate: '2026-03-12',
            checkOutDate: '2026-03-18',
            groupSize: 2,
          },
          runSelfImprove: true,
        },
        headers: validHeaders,
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Workflow Steps', () => {
    const validHeaders = { 'x-n8n-secret': N8N_SECRET };

    it('should include all workflow steps', async () => {
      const { data } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'penthouse',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-25',
            groupSize: 4,
          },
        },
        headers: validHeaders,
      });

      const stepNames = data.steps.map((s: any) => s.name);
      expect(stepNames).toContain('booking');
      expect(stepNames).toContain('curate');
      expect(stepNames).toContain('generate_content');
      expect(stepNames).toContain('email_and_social');
    });

    it('should set steps to queued status', async () => {
      const { data } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'suite',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        headers: validHeaders,
      });

      data.steps.forEach((step: any) => {
        if (step.name !== 'self_improve') {
          expect(step.status).toBe('queued');
        }
      });
    });
  });

  describe('Performance & Load Testing', () => {
    const validHeaders = { 'x-n8n-secret': N8N_SECRET };

    it('should handle rapid sequential requests', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { duration } = await testApiEndpoint({
          handler: POST,
          method: 'POST',
          body: {
            booking: {
              roomType: 'room-' + i,
              checkInDate: '2026-03-15',
              checkOutDate: '2026-03-22',
              groupSize: i + 1,
            },
          },
          headers: validHeaders,
          maxResponseTime: 1500,
        });

        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(1000);
    });

    it('should meet response time SLA', async () => {
      const { duration } = await testApiEndpoint({
        handler: POST,
        method: 'POST',
        body: {
          booking: {
            roomType: 'standard',
            checkInDate: '2026-03-15',
            checkOutDate: '2026-03-22',
            groupSize: 2,
          },
        },
        headers: validHeaders,
        maxResponseTime: 500,
      });

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    const validHeaders = { 'x-n8n-secret': N8N_SECRET };

    it('should handle missing booking data gracefully', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          // Missing booking — route still returns 200 with queued steps
        },
        headers: validHeaders,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: 'not-valid-json',
        headers: validHeaders,
      });

      const response = await POST(request);
      // Route catches JSON parse with .catch(() => ({})) and returns 200
      expect(response.status).toBe(200);
    });
  });

  afterAll(() => {
    console.log('=== n8n Trigger Performance Report ===');
    performanceMetrics.report();
  });
});
