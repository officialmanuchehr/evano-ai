import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Flag, Sparkles } from 'lucide-react'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { CallStatusBadge, PurposeLabel, needsFollowUp } from '@/components/calls/call-badges'
import { formatDate, formatDuration, formatTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Call details' }

type TranscriptLine = { role: 'assistant' | 'caller'; text: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// =============================================================================
// Dashboard → Calls → one call
// =============================================================================
export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser()
  if (!auth) redirect('/auth/login')

  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  // RLS + explicit org filter: another org's call id simply isn't found
  const { data: call } = await supabase
    .from('calls')
    .select('id, caller_number, started_at, created_at, ended_at, duration_seconds, status, purpose, summary, transcript, recording_url')
    .eq('id', id)
    .eq('organization_id', auth.profile.organization_id)
    .maybeSingle()

  if (!call) notFound()

  const timeZone = auth.profile.organizations?.timezone ?? 'UTC'
  const startedAt = call.started_at ?? call.created_at
  const transcript = (Array.isArray(call.transcript) ? call.transcript : []) as TranscriptLine[]
  const followUp = needsFollowUp(call.summary)
  const summaryText = followUp ? call.summary!.replace(/\s*Follow-up needed\.$/, '') : call.summary

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <Link href="/dashboard/calls" className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2' })}>
        <ArrowLeft className="h-4 w-4" /> All calls
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tabular-nums">{call.caller_number ?? 'Unknown caller'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(startedAt, timeZone)} · {formatTime(startedAt, timeZone)} · {formatDuration(call.duration_seconds)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            <PurposeLabel purpose={call.purpose} />
          </span>
          <CallStatusBadge status={call.status} />
        </div>
      </div>

      {/* Summary */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Summary
          </h2>
          {followUp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              <Flag className="h-3 w-3" /> Follow-up needed
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">
          {summaryText ??
            (call.status === 'in_progress'
              ? 'This call is still in progress.'
              : 'No summary — the caller didn’t say anything, or the summary is still being written.')}
        </p>
      </section>

      {/* Recording */}
      {call.recording_url && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">Recording</h2>
          <audio controls preload="none" src={call.recording_url} className="w-full">
            <a href={call.recording_url}>Download recording</a>
          </audio>
        </section>
      )}

      {/* Transcript */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Conversation</h2>
        {transcript.length ? (
          <ol className="space-y-3 text-sm">
            {transcript.map((line, i) => (
              <li key={i} className={line.role === 'caller' ? 'flex justify-end' : 'flex'}>
                <div className="max-w-[85%]">
                  <p className={`mb-0.5 text-xs text-muted-foreground ${line.role === 'caller' ? 'text-right' : ''}`}>
                    {line.role === 'caller' ? 'Caller' : 'Receptionist'}
                  </p>
                  <p
                    className={
                      line.role === 'caller'
                        ? 'rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-primary-foreground'
                        : 'rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2'
                    }
                  >
                    {line.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No conversation was recorded for this call.</p>
        )}
      </section>
    </div>
  )
}
