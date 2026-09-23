// =============================================================================
// Call values shared by server and client code (labels live in the dictionaries)
// =============================================================================

export const CALL_STATUSES = ['completed', 'in_progress', 'transferred', 'missed', 'failed'] as const
export const CALL_PURPOSES = ['booking', 'faq', 'cancellation', 'rescheduling', 'transfer', 'general', 'unknown'] as const

/** Summaries end with "Follow-up needed." when Claude flagged one. */
export function needsFollowUp(summary: string | null) {
  return Boolean(summary?.endsWith('Follow-up needed.'))
}
