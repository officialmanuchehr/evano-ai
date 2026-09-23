-- =============================================================================
-- AI RECEPTIONIST — Keep integration credentials server-side
-- Migration: 004_hide_integration_credentials.sql
--
-- encrypted_credentials holds AES-GCM encrypted OAuth refresh tokens. The app
-- only reads/writes it with the service role. Signed-in users may see their
-- integration's status, but never the ciphertext, and may not write rows.
-- =============================================================================

REVOKE SELECT ON public.integrations FROM authenticated, anon;
GRANT SELECT (id, organization_id, provider, provider_account_id, metadata, status, created_at, updated_at)
  ON public.integrations TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.integrations FROM authenticated, anon;
