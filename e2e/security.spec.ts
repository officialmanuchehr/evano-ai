import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { admin, newTestUser, registerToOnboarding, getProfile, cleanupTestUsers } from './helpers'

test.afterAll(cleanupTestUsers)

// =============================================================================
// Tenant isolation — a signed-in user must not be able to move themselves into
// another organization or promote their own role (migration 002).
// =============================================================================
test('user cannot change their own organization_id or role', async ({ browser }) => {
  // Two real accounts, each with its own org (created via the signup UI)
  const attacker = newTestUser()
  const victim = newTestUser()
  for (const u of [attacker, victim]) {
    const ctx = await browser.newContext()
    await registerToOnboarding(await ctx.newPage(), u)
    await ctx.close()
  }
  const attackerProfile = await getProfile(attacker.email)
  const victimProfile = await getProfile(victim.email)

  // Sign in as the attacker straight against Supabase (what a malicious client would do)
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { error: signInError } = await client.auth.signInWithPassword({
    email: attacker.email,
    password: attacker.password,
  })
  expect(signInError).toBeNull()

  // Attempt 1: join the victim's organization
  const { error: orgHijack } = await client
    .from('profiles')
    .update({ organization_id: victimProfile.organization_id })
    .eq('id', attackerProfile.id)
  expect(orgHijack?.code).toBe('42501') // insufficient_privilege

  // Attempt 2: promote own role
  const { error: roleHijack } = await client
    .from('profiles')
    .update({ role: 'admin' } as never)
    .eq('id', attackerProfile.id)
  expect(roleHijack?.code).toBe('42501')

  // Attacker's profile is unchanged
  const { data: after } = await admin
    .from('profiles')
    .select('organization_id, role')
    .eq('id', attackerProfile.id)
    .single()
  expect(after).toEqual({ organization_id: attackerProfile.organization_id, role: 'owner' })

  // Allowed columns still work (onboarding relies on this)
  const { error: allowed } = await client
    .from('profiles')
    .update({ full_name: 'Renamed Attacker' })
    .eq('id', attackerProfile.id)
  expect(allowed).toBeNull()
})
