/*
  Supabase `Database` type mapping for TypeScript projects using
  @supabase/supabase-js. Adjust the schema to match your actual DB.

  This file declares a `Database` interface with `public` schema and
  `profiles` table Row / Insert / Update types. Import it into
  your Supabase client generic: `createClient<Database>(...)` to get
  type-safe queries.
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      magic_content: {
        Row: {
          id: string;
          user_id: string;
          reservation_id: string | null;
          content_type: string;
          title: string;
          description: string | null;
          genre: string | null;
          prompt: string | null;
          media_url: string;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          status: string | null;
          error_message: string | null;
          generation_provider: string | null;
          processing_time_ms: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reservation_id?: string | null;
          content_type: string;
          title: string;
          description?: string | null;
          genre?: string | null;
          prompt?: string | null;
          media_url: string;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          status?: string | null;
          error_message?: string | null;
          generation_provider?: string | null;
          processing_time_ms?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reservation_id?: string | null;
          content_type?: string;
          title?: string;
          description?: string | null;
          genre?: string | null;
          prompt?: string | null;
          media_url?: string;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          status?: string | null;
          error_message?: string | null;
          generation_provider?: string | null;
          processing_time_ms?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      magic_questionnaire: {
        Row: {
          id: string;
          user_id: string;
          reservation_id: string | null;
          occasion: string | null;
          recipient_name: string | null;
          gift_you_name: string | null;
          key_memories: string | null;
          favorite_colors: string | null;
          favorite_songs_artists: string | null;
          message: string | null;
          music_style: string | null;
          mood: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reservation_id?: string | null;
          occasion?: string | null;
          recipient_name?: string | null;
          gift_you_name?: string | null;
          key_memories?: string | null;
          favorite_colors?: string | null;
          favorite_songs_artists?: string | null;
          message?: string | null;
          music_style?: string | null;
          mood?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reservation_id?: string | null;
          occasion?: string | null;
          recipient_name?: string | null;
          gift_you_name?: string | null;
          key_memories?: string | null;
          favorite_colors?: string | null;
          favorite_songs_artists?: string | null;
          message?: string | null;
          music_style?: string | null;
          mood?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      agent_runs: {
        Row: {
          id: string;
          user_id: string;
          agent_name: string;
          request_id: string | null;
          status: string;
          input: Json | null;
          output: Json | null;
          error_message: string | null;
          started_at: string | null;
          finished_at: string | null;
          duration_ms: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_name: string;
          request_id?: string | null;
          status?: string;
          input?: Json | null;
          output?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          duration_ms?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_name?: string;
          request_id?: string | null;
          status?: string;
          input?: Json | null;
          output?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          duration_ms?: number | null;
        };
      };
      agent_prompts: {
        Row: {
          id: string;
          agent_name: string;
          prompt_text: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          agent_name: string;
          prompt_text: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          agent_name?: string;
          prompt_text?: string;
          updated_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string; // uuid
          user_id: string; // references auth.users(id)
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          phone_number: string | null;
          // ISO date string (YYYY-MM-DD or full ISO timestamp)
          birthday: string | null;
          // ISO date string (YYYY-MM-DD or full ISO timestamp)
          anniversary: string | null;
          special_events: Array<{ name: string; date: string }> | null;
          music_style: string | null;
          maya_interests: string[] | null;
          opt_in_magic: boolean | null;
          magic_profile: string | null;
          language: string | null;
          country: string | null;
          dietary_restrictions: string[] | null;
          accessibility_needs: string | null;
          travel_style: string | null;
          loyalty_tier: string | null;
          total_stays: number | null;
          total_spend: number | null;
          referral_code: string | null;
          ai_preferences: Json | null;
          last_stay_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          birthday?: string | null;
          anniversary?: string | null;
          special_events?: Array<{ name: string; date: string }> | null;
          music_style?: string | null;
          maya_interests?: string[] | null;
          opt_in_magic?: boolean | null;
          magic_profile?: string | null;
          language?: string | null;
          country?: string | null;
          dietary_restrictions?: string[] | null;
          accessibility_needs?: string | null;
          travel_style?: string | null;
          loyalty_tier?: string | null;
          total_stays?: number | null;
          total_spend?: number | null;
          referral_code?: string | null;
          ai_preferences?: Json | null;
          last_stay_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          birthday?: string | null;
          anniversary?: string | null;
          special_events?: Array<{ name: string; date: string }> | null;
          music_style?: string | null;
          maya_interests?: string[] | null;
          opt_in_magic?: boolean | null;
          magic_profile?: string | null;
          language?: string | null;
          country?: string | null;
          dietary_restrictions?: string[] | null;
          accessibility_needs?: string | null;
          travel_style?: string | null;
          loyalty_tier?: string | null;
          total_stays?: number | null;
          total_spend?: number | null;
          referral_code?: string | null;
          ai_preferences?: Json | null;
          last_stay_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      guest_interactions: {
        Row: {
          id: string;
          user_id: string;
          interaction_type: string;
          channel: string;
          summary: string | null;
          sentiment: string | null;
          metadata: Json | null;
          reservation_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          interaction_type: string;
          channel?: string;
          summary?: string | null;
          sentiment?: string | null;
          metadata?: Json | null;
          reservation_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          interaction_type?: string;
          channel?: string;
          summary?: string | null;
          sentiment?: string | null;
          metadata?: Json | null;
          reservation_id?: string | null;
          created_at?: string | null;
        };
      };
      pre_arrival_packets: {
        Row: {
          id: string;
          reservation_id: string;
          user_id: string;
          sent_via: string;
          weather_forecast: Json | null;
          recommended_tours: Json | null;
          dining_suggestions: Json | null;
          personalized_tips: string | null;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          reservation_id: string;
          user_id: string;
          sent_via?: string;
          weather_forecast?: Json | null;
          recommended_tours?: Json | null;
          dining_suggestions?: Json | null;
          personalized_tips?: string | null;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          reservation_id?: string;
          user_id?: string;
          sent_via?: string;
          weather_forecast?: Json | null;
          recommended_tours?: Json | null;
          dining_suggestions?: Json | null;
          personalized_tips?: string | null;
          sent_at?: string | null;
        };
      };
      whatsapp_messages: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          phone_number: string;
          direction: string;
          body: string;
          twilio_sid: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          phone_number: string;
          direction: string;
          body: string;
          twilio_sid?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          phone_number?: string;
          direction?: string;
          body?: string;
          twilio_sid?: string | null;
          created_at?: string | null;
        };
      };
      whatsapp_sessions: {
        Row: {
          id: string;
          phone_number: string;
          user_id: string | null;
          last_message: string | null;
          context: Json | null;
          last_messages: Json | null;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          phone_number: string;
          user_id?: string | null;
          last_message?: string | null;
          context?: Json | null;
          last_messages?: Json | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          phone_number?: string;
          user_id?: string | null;
          last_message?: string | null;
          context?: Json | null;
          last_messages?: Json | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      // Add other tables here as needed
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
