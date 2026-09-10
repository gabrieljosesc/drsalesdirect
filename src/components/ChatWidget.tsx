'use client'

import Image from 'next/image'
import { useState } from 'react'
import { MessageCircle, Minus, Clock, Send } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Site chat bubble. Replaces the old WordPress site's third-party chat widget
 * (which still showed the old logo) with a native one carrying the current
 * branding. It is an offline lead-capture form — messages land in
 * contact_messages and show up in the admin inbox like contact-page mail.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject: 'Chat widget message', message }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      toast.error('Could not send your message. Please try again or email info@drsalesdirect.com.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Launcher (sits above the mobile floating-cart button) */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        className="fixed bottom-20 right-4 z-[90] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ec6a82] text-white shadow-lg transition hover:bg-[#d95672] md:bottom-4"
      >
        {open ? <Minus className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-[90] flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 md:bottom-20">
          {/* Header — current brand logo */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#ec6a82] to-[#f08aa0] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white p-1">
              <Image src="/logo.png" alt="Dr Sales Direct" width={32} height={32} className="object-contain" />
            </span>
            <span className="text-base font-semibold text-white">Dr Sales Direct</span>
            <button onClick={() => setOpen(false)} aria-label="Minimize chat" className="ml-auto text-white/80 hover:text-white">
              <Minus className="h-5 w-5" />
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 border-b border-gray-100 py-2 text-xs font-medium text-[#ec6a82]">
            <Clock className="h-3.5 w-3.5" /> Usually online from 9 PM – 5 AM EST
          </p>

          {sent ? (
            <div className="px-5 py-8 text-center text-sm text-gray-700">
              <p className="mb-1 text-base font-semibold text-gray-900">Message sent!</p>
              Thank you — one of our representatives will reach out to you shortly.
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2.5 p-4">
              <p className="text-sm leading-relaxed text-gray-700">
                Hello and welcome to <span className="font-semibold">Dr Sales Direct</span>!
                Leave your name, contact details, and a brief message and one of our
                representatives will reach out to you shortly.
              </p>
              <input
                required value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#ec6a82] focus:bg-white"
              />
              <input
                required type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email"
                className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#ec6a82] focus:bg-white"
              />
              <input
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#ec6a82] focus:bg-white"
              />
              <textarea
                required value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Brief message" rows={3}
                className="resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-[#ec6a82] focus:bg-white"
              />
              <button
                type="submit" disabled={sending}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#ec6a82] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d95672] disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}
