import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// =============================================================================
// AES-256-GCM encryption for integration credentials at rest.
// Key: INTEGRATIONS_ENCRYPTION_KEY (32 random bytes, base64) — server env only.
// Output is Postgres BYTEA hex text ("\x…" = iv ‖ auth tag ‖ ciphertext) so it
// can be written to a BYTEA column through PostgREST as-is.
// =============================================================================

function key() {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY
  const buf = raw ? Buffer.from(raw, 'base64') : null
  if (!buf || buf.length !== 32) throw new Error('INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes, base64-encoded')
  return buf
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return '\\x' + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('hex')
}

export function decryptSecret(bytea: string): string {
  const buf = Buffer.from(bytea.replace(/^\\x/, ''), 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}
