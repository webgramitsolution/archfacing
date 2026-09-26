'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { createPodcastAction, type SellerState } from '../actions'
import { Field, Input, Select, Textarea, Button, Alert } from '@/components/form'
import { Callout } from '@/components/ui'
import { PODCAST_CATEGORIES } from '@/config/taxonomy'
import { parseVideoUrl, VIDEO_HOST_LABEL } from '@/lib/video'

export function PodcastForm() {
  const [state, submit, pending] = useActionState<SellerState | null, FormData>(
    createPodcastAction,
    null
  )
  const [videoUrl, setVideoUrl] = useState('')

  const err = (k: string) => state?.fieldErrors?.[k]
  const prev = (k: string) => state?.values?.[k] ?? ''

  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state && !state.ok) setFormKey((k) => k + 1)
  }, [state])

  const video = videoUrl.trim() ? parseVideoUrl(videoUrl) : null

  if (state?.ok && state.createdSlug) {
    return (
      <Callout tone="ok" icon="check" title="Episode published">
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/podcast" className="btn-primary">View Podcast</Link>
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            Add another
          </Button>
        </div>
      </Callout>
    )
  }

  return (
    <form key={formKey} action={submit} className="flex flex-col gap-6">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Episode title" name="title" required error={err('title')}>
        <Input id="title" name="title" required maxLength={180}
          defaultValue={prev('title')} error={!!err('title')} />
      </Field>

      <Field
        label="Video link"
        name="videoUrl"
        required
        hint="YouTube or Dailymotion — no upload needed"
        error={err('videoUrl')}
      >
        <Input
          id="videoUrl" name="videoUrl" type="url" required
          placeholder="https://youtu.be/… or https://dailymotion.com/video/…"
          value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
          error={!!err('videoUrl') || (!!videoUrl.trim() && !video)}
        />
      </Field>

      {videoUrl.trim() && (
        <p className={`-mt-4 text-[12px] ${video ? 'text-ok' : 'text-brand'}`}>
          {video
            ? `✓ ${VIDEO_HOST_LABEL[video.host]} video — ${video.videoId}`
            : 'This link was not recognised.'}
        </p>
      )}

      <Field label="Description" name="description" required error={err('description')}>
        <Textarea id="description" name="description" rows={4} required
          defaultValue={prev('description')} error={!!err('description')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Category" name="category" required error={err('category')}>
          <Select id="category" name="category" required
            defaultValue={prev('category')} error={!!err('category')}>
            <option value="">Select…</option>
            {PODCAST_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Guest name" name="guestName">
          <Input id="guestName" name="guestName" defaultValue={prev('guestName')} />
        </Field>

        <Field label="Episode number" name="episodeNumber">
          <Input id="episodeNumber" name="episodeNumber" type="number" min={1}
            defaultValue={prev('episodeNumber')} />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Publish'}
      </Button>
    </form>
  )
}
