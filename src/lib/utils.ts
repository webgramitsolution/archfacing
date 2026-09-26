import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Kitchen Equipment" → "kitchen-equipment" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** ₹1,25,000 — Indian number format */
export function formatINR(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

/** An Indian 6-digit PIN code */
export function isValidPincode(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin)
}

/** An Indian mobile number — 10 digits, starting with 6-9 */
export function isValidMobile(mobile: string): boolean {
  return /^[6-9][0-9]{9}$/.test(mobile)
}
