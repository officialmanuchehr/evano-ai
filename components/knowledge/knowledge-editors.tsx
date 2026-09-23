'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { keepValues } from '@/lib/forms'
import { interpolate } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'
import { saveFaqsAction, saveServicesAction, type KnowledgeResult } from '@/lib/actions/knowledge'
import type { ServiceItem } from '@/lib/onboarding/constants'

export type FaqRow = { question: string; answer: string; is_active: boolean }

const emptyService: ServiceItem = { name: '', duration: 30, price: '' }
const emptyFaq: FaqRow = { question: '', answer: '', is_active: true }

/** Shared submit handling: success toast, or error, plus a non-blocking sync warning. */
function useSave(action: (fd: FormData) => Promise<KnowledgeResult>, successMessage: string) {
  return useActionState(async (_: unknown, formData: FormData) => {
    const result = await action(formData)
    if (!result.success) toast.error(result.error)
    else if (result.warning) toast.warning(result.warning)
    else toast.success(successMessage)
    return result
  }, null)
}

function SaveButton({ pending, label, saving }: { pending: boolean; label: string; saving: string }) {
  return (
    <Button type="submit" className="neon-glow hover:neon-glow-strong px-5" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {saving}
        </>
      ) : (
        label
      )}
    </Button>
  )
}

// =============================================================================
// Services
// =============================================================================
export function ServicesEditor({ initial }: { initial: ServiceItem[] }) {
  const { t } = useI18n()
  const k = t.knowledge
  const o = t.onboarding.services
  const [services, setServices] = useState<ServiceItem[]>(initial)
  const [, action, pending] = useSave(saveServicesAction, k.servicesSaved)

  const update = (i: number, patch: Partial<ServiceItem>) =>
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  return (
    <form onSubmit={keepValues(action)} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <input type="hidden" name="services" value={JSON.stringify(services.filter((s) => s.name.trim()))} />
      <div>
        <h2 className="font-medium">{k.servicesTitle}</h2>
        <p className="text-sm text-muted-foreground">{k.servicesText}</p>
      </div>

      <fieldset className="space-y-2" disabled={pending}>
        {services.length === 0 && <p className="text-sm text-muted-foreground">{k.noServices}</p>}
        {services.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6.5rem_7rem_auto]">
            <Input
              placeholder={o.servicePlaceholder}
              aria-label={interpolate(o.serviceName, { n: i + 1 })}
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:order-last"
              aria-label={interpolate(o.removeService, { n: i + 1 })}
              onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={5}
                max={600}
                step={5}
                aria-label={interpolate(o.serviceDuration, { n: i + 1 })}
                value={s.duration ?? ''}
                onChange={(e) => update(i, { duration: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="text-xs text-muted-foreground">{o.min}</span>
            </div>
            <Input
              placeholder={o.price}
              aria-label={interpolate(o.servicePrice, { n: i + 1 })}
              value={s.price}
              onChange={(e) => update(i, { price: e.target.value })}
            />
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setServices((p) => [...p, emptyService])}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {o.addService}
        </Button>
        <SaveButton pending={pending} label={k.saveServices} saving={t.common.saving} />
      </div>
    </form>
  )
}

// =============================================================================
// FAQs
// =============================================================================
export function FaqsEditor({ initial }: { initial: FaqRow[] }) {
  const { t } = useI18n()
  const k = t.knowledge
  const o = t.onboarding.services
  const [faqs, setFaqs] = useState<FaqRow[]>(initial)
  const [, action, pending] = useSave(saveFaqsAction, k.faqsSaved)

  const update = (i: number, patch: Partial<FaqRow>) =>
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  return (
    <form onSubmit={keepValues(action)} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <input
        type="hidden"
        name="faqs"
        value={JSON.stringify(faqs.filter((f) => f.question.trim() || f.answer.trim()))}
      />
      <div>
        <h2 className="font-medium">{k.faqsTitle}</h2>
        <p className="text-sm text-muted-foreground">{k.faqsText}</p>
      </div>

      <fieldset className="space-y-2" disabled={pending}>
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">{k.noFaqs}</p>}
        {faqs.map((f, i) => (
          <div key={i} className={`space-y-2 rounded-lg border p-3 ${f.is_active ? '' : 'bg-muted/60'}`}>
            <div className="flex items-center gap-2">
              <Input
                placeholder={o.questionPlaceholder}
                aria-label={interpolate(o.faqQuestion, { n: i + 1 })}
                value={f.question}
                onChange={(e) => update(i, { question: e.target.value })}
              />
              <label className="flex flex-shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.is_active}
                  onChange={(e) => update(i, { is_active: e.target.checked })}
                  aria-label={`${k.active} ${i + 1}`}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {k.active}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={interpolate(o.removeFaq, { n: i + 1 })}
                onClick={() => setFaqs((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              rows={2}
              placeholder={o.answerPlaceholder}
              aria-label={interpolate(o.faqAnswer, { n: i + 1 })}
              value={f.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
            />
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setFaqs((p) => [...p, emptyFaq])}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {o.addFaq}
        </Button>
        <SaveButton pending={pending} label={k.saveFaqs} saving={t.common.saving} />
      </div>
    </form>
  )
}
