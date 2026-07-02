'use client'

import { useState } from 'react'
import { Phone, Mail, Clock, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Message sent! We\'ll get back to you within 24 hours.')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } else {
      toast.error('Failed to send. Please email us directly.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500">Our team is ready to assist you within 24 business hours.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Contact info */}
        <div className="space-y-6">
          <div className="bg-[#ec6a82] text-white rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Hotline</p>
                <a href="tel:+18558434782" className="text-sm text-rose-100 hover:text-white">+1-855-843-4782</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Printer className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Fax</p>
                <p className="text-sm text-rose-100">+1-844-611-8975</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Email</p>
                <a href="mailto:info@drsalesdirect.com" className="text-sm text-rose-100 hover:text-white break-all">
                  info@drsalesdirect.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Business Hours</p>
                <p className="text-sm text-rose-100">Mon – Fri / 9:00 AM – 6:00 PM EST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Get in Touch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={set('name')} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={set('email')} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" value={form.subject} onChange={set('subject')} required className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <textarea
                id="message"
                value={form.message}
                onChange={set('message')}
                required
                rows={5}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] resize-none"
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-[#ec6a82] hover:bg-[#d95672]">
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
