-- =============================================================================
-- AI RECEPTIONIST — Server-owned voice/phone fields
-- Migration: 003_server_owned_voice_fields.sql
--
-- provider_agent_id, status and phone_numbers are written only by the server
-- (service role) after talking to Vapi. Signed-in users must not be able to set
-- them directly, e.g. pointing provider_agent_id at another org's assistant.
-- =============================================================================

-- ai_agents: users may edit the receptionist's settings, not its provider link/status
REVOKE UPDATE ON public.ai_agents FROM authenticated, anon;
GRANT UPDATE (name, voice_id, language, tone, response_length, greeting, system_prompt, updated_at)
  ON public.ai_agents TO authenticated;
REVOKE INSERT, DELETE ON public.ai_agents FROM authenticated, anon;

-- phone_numbers: read-only for users; connect/disconnect goes through the server
REVOKE INSERT, UPDATE, DELETE ON public.phone_numbers FROM authenticated, anon;
