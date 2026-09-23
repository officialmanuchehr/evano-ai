'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PhoneIncoming } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateAgentAction } from '@/lib/actions/agent'
import { LANGUAGES, LIMITS, RESPONSE_LENGTHS, TONES, VOICES, type ResponseLength, type Tone } from '@/lib/agent/constants'
import { selectClassName } from '@/lib/onboarding/constants'

export type AgentFormValues = {
  name: string
  greeting: string
  tone: Tone
  response_length: ResponseLength
  language: string
  voice_id: string
  system_prompt: string
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn('text-xs tabular-nums', value.length > max ? 'text-destructive' : 'text-muted-foreground')}>
      {value.length}/{max}
    </span>
  )
}

// =============================================================================
// AI Receptionist settings form
// =============================================================================
export function AgentForm({ initial }: { initial: AgentFormValues }) {
  const [name, setName] = useState(initial.name)
  const [greeting, setGreeting] = useState(initial.greeting)
  const [tone, setTone] = useState<Tone>(initial.tone)
  const [length, setLength] = useState<ResponseLength>(initial.response_length)
  const [instructions, setInstructions] = useState(initial.system_prompt)

  const [, action, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await updateAgentAction(formData)
    if (result.success) toast.success('Settings saved')
    else if (result.error) toast.error(result.error)
    return result
  }, null)

  return (
    <form action={action} className="space-y-6">
      {/* ------------------------------------------------ Identity + greeting */}
      <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-medium">Identity</h2>
          <p className="text-sm text-muted-foreground">How your receptionist introduces itself.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="name">Receptionist name</Label>
            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select id="language" name="language" defaultValue={initial.language} disabled={pending} className={selectClassName}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice_id">Voice</Label>
            <select id="voice_id" name="voice_id" defaultValue={initial.voice_id} disabled={pending} className={selectClassName}>
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="greeting">Greeting</Label>
            <Counter value={greeting} max={LIMITS.greeting} />
          </div>
          <Textarea
            id="greeting"
            name="greeting"
            rows={2}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            required
            disabled={pending}
          />
          {/* Live preview of what callers hear first */}
          <div className="flex items-start gap-3 rounded-lg bg-secondary/70 p-3">
            <span className="neon-gradient mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full">
              <PhoneIncoming className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-xs font-medium text-primary">{name || 'Receptionist'} says</p>
              <p className="break-words">“{greeting || '…'}”</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Personality */}
      <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-medium">Personality</h2>
          <p className="text-sm text-muted-foreground">The style your receptionist speaks in.</p>
        </div>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Tone</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {TONES.map((t) => (
              <label
                key={t.value}
                className={cn(
                  'cursor-pointer rounded-lg border p-3 transition-colors',
                  tone === t.value ? 'border-primary bg-secondary neon-glow' : 'hover:bg-muted'
                )}
              >
                <input
                  type="radio"
                  name="tone"
                  value={t.value}
                  checked={tone === t.value}
                  onChange={() => setTone(t.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Answer length</legend>
          <div className="inline-flex rounded-lg border p-1">
            {RESPONSE_LENGTHS.map((r) => (
              <label
                key={r.value}
                className={cn(
                  'cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors',
                  length === r.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <input
                  type="radio"
                  name="response_length"
                  value={r.value}
                  checked={length === r.value}
                  onChange={() => setLength(r.value)}
                  className="sr-only"
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ------------------------------------------------ Custom instructions */}
      <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">Custom instructions</h2>
            <p className="text-sm text-muted-foreground">
              Anything specific the receptionist should always do or never do.
            </p>
          </div>
          <Counter value={instructions} max={LIMITS.instructions} />
        </div>
        <Textarea
          id="system_prompt"
          name="system_prompt"
          aria-label="Custom instructions"
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={'e.g. Always ask for the caller’s name first.\nNever quote prices for surgery — offer a consultation instead.'}
          disabled={pending}
        />
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="neon-glow hover:neon-glow-strong px-6" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </form>
  )
}
