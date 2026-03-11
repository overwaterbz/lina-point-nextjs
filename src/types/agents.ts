import type { Json } from '@/types/supabase-db';

export type AgentName =
  | 'price_scout'
  | 'experience_curator'
  | 'content_magic'
  | 'whatsapp_concierge'
  | 'self_improvement'
  | 'health_monitor'
  | 'marketing_crew'
  | 'guest_intelligence'
  | 'pre_arrival'
  | 'trip_planner';

export type AgentRunStatus = 'started' | 'completed' | 'failed';

export interface AgentRunInput {
  request_id?: string | null;
  payload: Json;
}

export interface AgentRunOutput {
  payload: Json;
  error_message?: string | null;
}
