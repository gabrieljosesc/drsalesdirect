import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const raw = process.env.PAYMENT_CARD_SECRET
  if (!raw || raw.length < 16) {
    throw new Error('PAYMENT_CARD_SECRET is not set or too short. Use a long random string (32+ chars).')
  }
  return scryptSync(raw, 'peak-medical-card-salt', 32)
}

/** Encrypt card PAN (digits only). Returns base64(iv + tag + ciphertext). */
export function encryptCardPan(panDigits: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(panDigits, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptCardPan(blob: string): string {
  const key = getKey()
  const buf = Buffer.from(blob, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error('Invalid encrypted payload.')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** CVV uses the same AES-256-GCM scheme as the PAN. */
export const encryptCardCvv = encryptCardPan
export const decryptCardCvv = decryptCardPan
