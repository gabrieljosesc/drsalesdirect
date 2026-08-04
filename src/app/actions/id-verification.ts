'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'id-documents' // PRIVATE bucket — service-role access only
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export type UploadIdResult = { ok: true; path: string } | { ok: false; message: string }

/**
 * Uploads a government-issued photo ID for international-order verification.
 * The bucket is private: the file is written with the service role and can
 * only be read back by admins (signed URLs on the admin order page).
 */
export async function uploadIdDocument(formData: FormData): Promise<UploadIdResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in first.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a file to upload.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'File is too large (max 10 MB).' }
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: 'Upload a JPG, PNG, WebP image or a PDF.' }
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg')
  const path = `${user.id}/${Date.now()}-id.${ext}`

  const svc = createAdminClient()
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await svc.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, message: `Upload failed: ${error.message}` }

  return { ok: true, path }
}
