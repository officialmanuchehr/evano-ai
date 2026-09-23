'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StepActions, FieldHint } from '@/components/onboarding/step-card'
import { completeOnboardingAction } from '@/lib/actions/onboarding'
import type { FaqItem, ServiceItem } from '@/lib/onboarding/constants'

const emptyService: ServiceItem = { name: '', duration: 30, price: '' }
const emptyFaq: FaqItem = { question: '', answer: '' }

// =============================================================================
// Step 3 form — services the business offers + common caller questions.
// Lists are edited client-side and sent as JSON; blank rows are dropped.
// =============================================================================
export function ServicesForm({
  initialServices,
  initialFaqs,
}: {
  initialServices: ServiceItem[]
  initialFaqs: FaqItem[]
}) {
  const [services, setServices] = useState<ServiceItem[]>(
    initialServices.length ? initialServices : [emptyService]
  )
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs.length ? initialFaqs : [emptyFaq])

  const filledServices = services.filter((s) => s.name.trim())
  const filledFaqs = faqs.filter((f) => f.question.trim() || f.answer.trim())

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await completeOnboardingAction(formData)
    if (!result.success && result.error) toast.error(result.error)
    return result
  }, null)

  function updateService(i: number, patch: Partial<ServiceItem>) {
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function updateFaq(i: number, patch: Partial<FaqItem>) {
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="services" value={JSON.stringify(filledServices)} />
      <input type="hidden" name="faqs" value={JSON.stringify(filledFaqs)} />

      {/* Services */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-1 text-sm font-medium">Services</legend>
        <FieldHint>What callers can book. Leave blank to skip — you can add these later.</FieldHint>

        {services.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6.5rem_7rem_auto]">
            <Input
              placeholder="Service name, e.g. Haircut"
              aria-label={`Service ${i + 1} name`}
              value={s.name}
              onChange={(e) => updateService(i, { name: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:order-last"
              aria-label={`Remove service ${i + 1}`}
              onClick={() => setServices((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyService]))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={5}
                max={600}
                step={5}
                aria-label={`Service ${i + 1} duration in minutes`}
                value={s.duration ?? ''}
                onChange={(e) => updateService(i, { duration: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
            <Input
              placeholder="Price"
              aria-label={`Service ${i + 1} price`}
              value={s.price}
              onChange={(e) => updateService(i, { price: e.target.value })}
            />
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={() => setServices((p) => [...p, emptyService])}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add service
        </Button>
      </fieldset>

      {/* FAQs */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-1 text-sm font-medium">Frequently asked questions</legend>
        <FieldHint>Questions callers often ask, and how the AI should answer them.</FieldHint>

        {faqs.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Question, e.g. Do you have parking?"
                aria-label={`FAQ ${i + 1} question`}
                value={f.question}
                onChange={(e) => updateFaq(i, { question: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove FAQ ${i + 1}`}
                onClick={() => setFaqs((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyFaq]))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              rows={2}
              placeholder="Answer, e.g. Yes — free parking behind the building."
              aria-label={`FAQ ${i + 1} answer`}
              value={f.answer}
              onChange={(e) => updateFaq(i, { answer: e.target.value })}
            />
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={() => setFaqs((p) => [...p, emptyFaq])}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add question
        </Button>
      </fieldset>

      <StepActions backHref="/onboarding/hours" pending={pending} submitLabel="Finish setup" />
    </form>
  )
}
