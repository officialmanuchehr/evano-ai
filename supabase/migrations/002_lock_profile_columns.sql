-- =============================================================================
-- AI RECEPTIONIST — Lock down which profile columns users may change
-- Migration: 002_lock_profile_columns.sql
--
-- The "profiles_update_own" RLS policy lets a user update their own row, but
-- RLS is row-level only: without column privileges a user could rewrite
-- organization_id (and join another org, since every RLS policy trusts it)
-- or promote their own role. Only these columns are user-editable:
-- =============================================================================

REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, onboarding_completed, updated_at) ON public.profiles TO authenticated;

-- Same idea for organizations: users may edit their org's details, never its slug
REVOKE UPDATE ON public.organizations FROM authenticated, anon;
GRANT UPDATE (name, logo_url, industry, timezone, updated_at) ON public.organizations TO authenticated;
