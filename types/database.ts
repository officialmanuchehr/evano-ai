// =============================================================================
// Database Types — generated from Supabase schema
// Represents all tables, rows, inserts, and updates
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          industry: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          industry?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          industry?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          full_name: string | null
          email: string
          role: 'owner' | 'admin' | 'member'
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          full_name?: string | null
          email: string
          role?: 'owner' | 'admin' | 'member'
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          email?: string
          role?: 'owner' | 'admin' | 'member'
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          id: string
          organization_id: string
          name: string
          voice_provider: string
          voice_id: string | null
          language: string
          tone: 'professional' | 'friendly' | 'casual'
          response_length: 'short' | 'balanced' | 'detailed'
          greeting: string | null
          system_prompt: string | null
          status: 'draft' | 'active' | 'paused'
          provider_agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name?: string
          voice_provider?: string
          voice_id?: string | null
          language?: string
          tone?: 'professional' | 'friendly' | 'casual'
          response_length?: 'short' | 'balanced' | 'detailed'
          greeting?: string | null
          system_prompt?: string | null
          status?: 'draft' | 'active' | 'paused'
          provider_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          voice_provider?: string
          voice_id?: string | null
          language?: string
          tone?: 'professional' | 'friendly' | 'casual'
          response_length?: 'short' | 'balanced' | 'detailed'
          greeting?: string | null
          system_prompt?: string | null
          status?: 'draft' | 'active' | 'paused'
          provider_agent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          id: string
          organization_id: string
          agent_id: string | null
          phone_number: string
          provider: string
          provider_number_id: string | null
          status: 'active' | 'disconnected' | 'error'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id?: string | null
          phone_number: string
          provider?: string
          provider_number_id?: string | null
          status?: 'active' | 'disconnected' | 'error'
          created_at?: string
        }
        Update: {
          agent_id?: string | null
          phone_number?: string
          provider?: string
          provider_number_id?: string | null
          status?: 'active' | 'disconnected' | 'error'
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          id: string
          organization_id: string
          day_of_week: number
          open_time: string | null
          close_time: string | null
          is_closed: boolean
        }
        Insert: {
          id?: string
          organization_id: string
          day_of_week: number
          open_time?: string | null
          close_time?: string | null
          is_closed?: boolean
        }
        Update: {
          open_time?: string | null
          close_time?: string | null
          is_closed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          id: string
          organization_id: string
          question: string
          answer: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          question: string
          answer: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          question?: string
          answer?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          id: string
          organization_id: string
          name: string
          file_url: string | null
          file_type: 'pdf' | 'txt' | 'docx' | null
          status: 'processing' | 'ready' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          file_url?: string | null
          file_type?: 'pdf' | 'txt' | 'docx' | null
          status?: 'processing' | 'ready' | 'error'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          file_url?: string | null
          file_type?: 'pdf' | 'txt' | 'docx' | null
          status?: 'processing' | 'ready' | 'error'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          id: string
          organization_id: string
          document_id: string | null
          content: string
          embedding: number[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          document_id?: string | null
          content: string
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          content?: string
          embedding?: number[] | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          id: string
          organization_id: string
          agent_id: string | null
          phone_number_id: string | null
          caller_number: string | null
          provider_call_id: string | null
          started_at: string | null
          ended_at: string | null
          duration_seconds: number | null
          status: 'in_progress' | 'completed' | 'missed' | 'failed' | 'transferred'
          purpose: 'faq' | 'booking' | 'cancellation' | 'rescheduling' | 'general' | 'transfer' | 'unknown' | null
          summary: string | null
          transcript: Json | null
          recording_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id?: string | null
          phone_number_id?: string | null
          caller_number?: string | null
          provider_call_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          status?: 'in_progress' | 'completed' | 'missed' | 'failed' | 'transferred'
          purpose?: 'faq' | 'booking' | 'cancellation' | 'rescheduling' | 'general' | 'transfer' | 'unknown' | null
          summary?: string | null
          transcript?: Json | null
          recording_url?: string | null
          created_at?: string
        }
        Update: {
          agent_id?: string | null
          phone_number_id?: string | null
          caller_number?: string | null
          provider_call_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          status?: 'in_progress' | 'completed' | 'missed' | 'failed' | 'transferred'
          purpose?: 'faq' | 'booking' | 'cancellation' | 'rescheduling' | 'general' | 'transfer' | 'unknown' | null
          summary?: string | null
          transcript?: Json | null
          recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          organization_id: string
          agent_id: string | null
          call_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          service: string | null
          start_time: string
          end_time: string
          status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'
          external_provider: 'google_calendar' | 'microsoft_calendar' | 'calendly' | null
          external_booking_id: string | null
          notes: string | null
          created_by: 'ai' | 'human'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id?: string | null
          call_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          service?: string | null
          start_time: string
          end_time: string
          status?: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'
          external_provider?: 'google_calendar' | 'microsoft_calendar' | 'calendly' | null
          external_booking_id?: string | null
          notes?: string | null
          created_by?: 'ai' | 'human'
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          service?: string | null
          start_time?: string
          end_time?: string
          status?: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'
          external_provider?: 'google_calendar' | 'microsoft_calendar' | 'calendly' | null
          external_booking_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          id: string
          organization_id: string
          provider: 'google_calendar' | 'microsoft_calendar' | 'calendly' | 'vapi' | 'retell'
          provider_account_id: string | null
          // BYTEA as "\x…" hex text; AES-GCM ciphertext — only ever selected server-side (lib/crypto.ts)
          encrypted_credentials: string | null
          metadata: Json
          status: 'connected' | 'disconnected' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider: 'google_calendar' | 'microsoft_calendar' | 'calendly' | 'vapi' | 'retell'
          provider_account_id?: string | null
          encrypted_credentials?: string | null
          metadata?: Json
          status?: 'connected' | 'disconnected' | 'error'
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider_account_id?: string | null
          encrypted_credentials?: string | null
          metadata?: Json
          status?: 'connected' | 'disconnected' | 'error'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage: {
        Row: {
          id: string
          organization_id: string
          period_start: string
          period_end: string
          voice_minutes: number
          calls_count: number
          bookings_count: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          period_start: string
          period_end: string
          voice_minutes?: number
          calls_count?: number
          bookings_count?: number
          created_at?: string
        }
        Update: {
          voice_minutes?: number
          calls_count?: number
          bookings_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          plan: 'free' | 'starter' | 'pro' | 'enterprise'
          status: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_info: {
        Row: {
          id: string
          organization_id: string
          description: string | null
          address: string | null
          website: string | null
          phone: string | null
          email: string | null
          services: Json
          after_hours_behavior: 'ai' | 'voicemail' | 'transfer'
          transfer_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          description?: string | null
          address?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          services?: Json
          after_hours_behavior?: 'ai' | 'voicemail' | 'transfer'
          transfer_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          address?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          services?: Json
          after_hours_behavior?: 'ai' | 'voicemail' | 'transfer'
          transfer_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_info_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      current_org_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// =============================================================================
// Convenience type aliases
// =============================================================================
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type AiAgent = Tables<'ai_agents'>
export type PhoneNumber = Tables<'phone_numbers'>
export type BusinessHour = Tables<'business_hours'>
export type Faq = Tables<'faqs'>
export type KnowledgeDocument = Tables<'knowledge_documents'>
export type KnowledgeChunk = Tables<'knowledge_chunks'>
export type Call = Tables<'calls'>
export type Booking = Tables<'bookings'>
export type Integration = Tables<'integrations'>
export type Usage = Tables<'usage'>
export type Subscription = Tables<'subscriptions'>
export type BusinessInfo = Tables<'business_info'>
