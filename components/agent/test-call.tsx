'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mic, PhoneOff } from 'lucide-react'
import type VapiType from '@vapi-ai/web'
import { Button } from '@/components/ui/button'
import { prepareTestCallAction } from '@/lib/actions/agent'
import { useI18n } from '@/lib/i18n/client'

type Line = { role: 'assistant' | 'user'; text: string }
type Status = 'idle' | 'connecting' | 'live'

// Public (browser-safe) Vapi key — different from the private server key
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY

// =============================================================================
// Talk to the receptionist from the browser (uses the mic, no phone needed)
// =============================================================================
export function TestCall() {
  const vapiRef = useRef<VapiType | null>(null)
  const { t } = useI18n()
  const a = t.agent
  const [status, setStatus] = useState<Status>('idle')
  const [speaking, setSpeaking] = useState(false)
  const [lines, setLines] = useState<Line[]>([])

  // Always hang up if the user leaves the page mid-call
  useEffect(() => () => void vapiRef.current?.stop(), [])

  async function start() {
    if (!PUBLIC_KEY) return
    setStatus('connecting')
    setLines([])

    // Pushes the latest saved settings to Vapi first
    const prepared = await prepareTestCallAction()
    if (!prepared.success || !prepared.assistantId) {
      toast.error(prepared.error ?? t.errors.testCallFailed)
      setStatus('idle')
      return
    }

    const { default: Vapi } = await import('@vapi-ai/web')
    const vapi = new Vapi(PUBLIC_KEY)
    vapiRef.current = vapi

    vapi.on('call-start', () => setStatus('live'))
    vapi.on('call-end', () => {
      setStatus('idle')
      setSpeaking(false)
      vapiRef.current = null
    })
    vapi.on('speech-start', () => setSpeaking(true))
    vapi.on('speech-end', () => setSpeaking(false))
    vapi.on('message', (msg: { type?: string; transcriptType?: string; role?: string; transcript?: string }) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final' && msg.transcript) {
        setLines((prev) => [...prev, { role: msg.role === 'assistant' ? 'assistant' : 'user', text: msg.transcript! }])
      }
    })
    vapi.on('error', (err: unknown) => {
      console.error('[test-call]', err)
      toast.error(a.testError)
      setStatus('idle')
    })

    try {
      await vapi.start(prepared.assistantId)
    } catch (err) {
      console.error('[test-call] start failed', err)
      toast.error(a.testStartError)
      setStatus('idle')
    }
  }

  async function stop() {
    await vapiRef.current?.stop()
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium">{a.testTitle}</h2>
      </div>

      {!PUBLIC_KEY ? (
        <p className="text-sm text-muted-foreground">{a.testNoKey}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{a.testText}</p>

          {status === 'live' ? (
            <Button type="button" variant="destructive" className="w-full" onClick={stop}>
              <PhoneOff className="mr-1.5 h-4 w-4" />
              {a.endCall}
            </Button>
          ) : (
            <Button
              type="button"
              className="neon-glow hover:neon-glow-strong w-full"
              onClick={start}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {a.connecting}
                </>
              ) : (
                <>
                  <Mic className="mr-1.5 h-4 w-4" />
                  {a.startCall}
                </>
              )}
            </Button>
          )}

          {status === 'live' && (
            <p className="flex items-center gap-2 text-xs text-primary">
              <span
                className={`h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_var(--neon)] ${speaking ? 'animate-pulse' : ''}`}
              />
              {speaking ? a.speaking : a.listening}
            </p>
          )}

          {lines.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto border-t pt-3 text-sm">
              {lines.map((l, i) => (
                <p
                  key={i}
                  className={
                    l.role === 'assistant'
                      ? 'w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-1.5'
                      : 'ml-auto w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-primary px-3 py-1.5 text-primary-foreground'
                  }
                >
                  {l.text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
