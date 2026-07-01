import { z } from 'zod'

export const registerSchema = z
  .object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    confirm_email: z.string().trim().min(1, 'Please confirm your email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special character (!@#$%...)'),
    confirm_password: z.string().min(1, 'Please confirm your password'),

    // Contact
    prefix: z.string().optional(),
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    middle_name: z.string().trim().optional(),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number is required')
      .regex(/^[\d\s\-+().]{7,}$/, 'Enter a valid phone number'),

    // Business + medical license
    company: z.string().trim().min(1, 'Company / clinic name is required').max(200),
    license_holder_name: z.string().trim().min(1, 'Name on the license is required').max(200),
    profession: z.string().trim().min(1, 'License type is required').max(200),
    specialty: z.string().trim().max(200).optional(),
    license_number: z.string().trim().min(1, 'License number is required').max(120),
    license_expiry: z.string().min(1, 'License expiry date is required'),
    license_state: z.string().trim().min(1, 'State / county issued is required').max(120),
    license_country: z.string().trim().min(1, 'Country issued is required').max(120),
    business_phone: z
      .string()
      .trim()
      .min(7, 'Business phone is required')
      .regex(/^[\d\s\-+().]{7,}$/, 'Enter a valid business phone number'),
    website: z.string().trim().max(300).optional(),

    // Delivery address
    address_line1: z.string().trim().min(1, 'Delivery address is required').max(300),
    city:          z.string().trim().min(1, 'City is required').max(120),
    state:         z.string().trim().min(1, 'State / province is required').max(120),
    postal_code:   z.string().trim().min(1, 'ZIP / postal code is required').max(32),
    country:       z.string().trim().min(1, 'Country is required').max(120),
  })
  .refine((d) => d.email === d.confirm_email, {
    message: 'Emails do not match',
    path: ['confirm_email'],
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .refine(
    (d) => {
      if (!d.license_expiry) return false
      const t = new Date(d.license_expiry)
      return !isNaN(t.getTime())
    },
    { message: 'Enter a valid expiry date', path: ['license_expiry'] }
  )
  .refine(
    (d) => {
      const t = new Date(d.license_expiry)
      return t > new Date()
    },
    { message: 'License expiry must be in the future', path: ['license_expiry'] }
  )

export type RegisterInput = z.infer<typeof registerSchema>

export function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !out[key]) out[key] = issue.message
  }
  return out
}
