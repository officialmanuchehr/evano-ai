import { z } from 'zod'

// =============================================================================
// Services + FAQ validation — shared by onboarding and the Knowledge page
// =============================================================================

export const servicesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(100),
      duration: z.number().int().min(5).max(600).nullable(),
      price: z.string().trim().max(40),
    })
  )
  .max(50)

export const faqsSchema = z
  .array(
    z.object({
      question: z.string().trim().min(3).max(300),
      answer: z.string().trim().min(1).max(2000),
      // Knowledge page can switch FAQs off without deleting them
      is_active: z.boolean().default(true),
    })
  )
  .max(50)

/** Read a JSON-encoded list from a form field (null when malformed). */
export function parseJsonField(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(String(formData.get(key) ?? '[]'))
  } catch {
    return null
  }
}
