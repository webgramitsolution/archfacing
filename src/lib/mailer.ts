/**
 * ArchFacing — outgoing email setup (Hostinger SMTP)
 *
 * Hostinger settings:
 *   Host : smtp.hostinger.com
 *   Port : 465 (SSL)  or  587 (TLS)
 *   User : the full email address — e.g. noreply@archfacing.com
 *   Pass : the password for that mailbox (created in hPanel → Emails)
 *
 * If SMTP_USER is empty no email is sent — the OTP is printed to the terminal
 * instead. This lets the whole registration flow be tested without SMTP.
 */

import nodemailer, { type Transporter } from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.hostinger.com'
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465)
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'ArchFacing <noreply@archfacing.com>'

/** Is SMTP configured, or are we in dev mode? */
export const isMailConfigured = Boolean(SMTP_USER && SMTP_PASS)

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // 465 = implicit SSL, 587 = STARTTLS
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Hostinger is occasionally slow to respond
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  return transporter
}

type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
}

/** Escape user-supplied text before it goes into an email's HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

export async function sendMail({ to, subject, html, text }: SendArgs) {
  if (!isMailConfigured) {
    // Never print the body in production — it can carry a login code or a
    // temporary password.
    if (process.env.NODE_ENV === 'production') {
      console.error(`SMTP is not configured — email to ${to} was not sent.`)
      return { sent: false as const, devMode: false as const }
    }
    console.warn(
      `\n📧 [DEV] SMTP is not configured — email was not sent.\n` +
        `   To: ${to}\n   Subject: ${subject}\n` +
        `   ${text.replace(/\n/g, '\n   ')}\n`
    )
    return { sent: false as const, devMode: true as const }
  }

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html, text })
  return { sent: true as const, devMode: false as const }
}

/** Whether the SMTP settings are valid — used for the check in the admin panel */
export async function verifySmtp() {
  if (!isMailConfigured) {
    return { ok: false as const, reason: 'SMTP_USER / SMTP_PASS are not set' }
  }
  try {
    await getTransporter().verify()
    return { ok: true as const, host: SMTP_HOST, port: SMTP_PORT }
  } catch (e) {
    return { ok: false as const, reason: (e as Error).message }
  }
}

// ═══════════════════════════════════════════════════════════
//  Email templates
// ═══════════════════════════════════════════════════════════

const BRAND = {
  ink: '#1A1D21',
  ink2: '#4A5158',
  ink3: '#7A838C',
  paper: '#F7F8FA',
  rule: '#E4E8ED',
  brand: '#FF5722',
  logo: 'https://ik.imagekit.io/archfacing/ArchFacing%20Logo/ArchFacing%20Logo.webp',
}

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:24px 12px;background:${BRAND.paper};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
    <tr><td style="padding-bottom:20px;border-bottom:2px solid ${BRAND.ink}">
      <img src="${BRAND.logo}" alt="ArchFacing" width="112" height="63" style="display:block;border:0">
    </td></tr>
    <tr><td style="padding:28px 0">${bodyHtml}</td></tr>
    <tr><td style="padding-top:20px;border-top:1px solid ${BRAND.rule};font-size:11px;color:${BRAND.ink3};letter-spacing:.06em">
      ARCHFACING · WE THE DESIGNA AND DESIGNI<br>
      <a href="mailto:support@archfacing.com" style="color:${BRAND.ink3}">support@archfacing.com</a>
      &nbsp;·&nbsp; +91 9667987129
    </td></tr>
  </table>
</body></html>`
}

/** The one-time passcode email */
export function otpEmail(code: string, purpose: 'REGISTRATION' | 'LOGIN') {
  const heading =
    purpose === 'REGISTRATION'
      ? 'Complete your ArchFacing registration'
      : 'Sign in to ArchFacing'

  const subject =
    purpose === 'REGISTRATION'
      ? `${code} — ArchFacing registration code`
      : `${code} — ArchFacing sign-in code`

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;line-height:1.3">${heading}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${BRAND.ink2}">
      Enter the 6-digit code below to continue. It is valid for <strong>10 minutes</strong>.
    </p>
    <div style="margin:0 0 24px;padding:18px;background:#fff;border:1px solid ${BRAND.rule};border-radius:6px;text-align:center">
      <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:34px;font-weight:600;letter-spacing:.22em;color:${BRAND.brand}">
        ${code}
      </div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.ink3}">
      If you did not request this code, you can safely ignore this email — your
      account will not be affected. Please do not share this code with anyone.
    </p>
  `)

  const text = [
    heading,
    '',
    `Your code: ${code}`,
    'This code is valid for 10 minutes.',
    '',
    'If you did not request this code, you can safely ignore this email.',
    'Please do not share this code with anyone.',
    '',
    'ArchFacing · support@archfacing.com',
  ].join('\n')

  return { subject, html, text }
}

/** Welcome email sent once registration is complete */
export function welcomeEmail(name: string, dashboardUrl: string) {
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600">Welcome to ArchFacing, ${escapeHtml(name)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.ink2}">
      Your account is ready. You can now complete your profile, publish your
      work, and acquire the PACT for your PIN code to receive enquiries from
      that territory.
    </p>
    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.ink};color:${BRAND.paper};text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Open your dashboard
    </a>
  `)

  const text = [
    `Welcome to ArchFacing, ${name}`,
    '',
    'Your account is ready.',
    `Dashboard: ${dashboardUrl}`,
    '',
    'ArchFacing · support@archfacing.com',
  ].join('\n')

  return { subject: 'Welcome to ArchFacing', html, text }
}

/** Sends sign-in credentials to an employee account created by an admin */
export function employeeCredentialsEmail(
  name: string,
  email: string,
  password: string,
  loginUrl: string
) {
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600">Your ArchFacing employee account</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.ink2}">
      Hello ${escapeHtml(name)}, an ArchFacing employee account has been created for you.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px">
      <tr><td style="padding:6px 16px 6px 0;color:${BRAND.ink3}">Email</td><td style="font-family:ui-monospace,monospace">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:${BRAND.ink3}">Password</td><td style="font-family:ui-monospace,monospace">${escapeHtml(password)}</td></tr>
    </table>
    <a href="${loginUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.ink};color:${BRAND.paper};text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Sign in
    </a>
    <p style="margin:20px 0 0;font-size:13px;color:${BRAND.ink3}">
      Please change your password the first time you sign in.
    </p>
  `)

  const text = [
    `Hello ${name}, an ArchFacing employee account has been created for you.`,
    '',
    `Email: ${email}`,
    `Password: ${password}`,
    `Sign in: ${loginUrl}`,
    '',
    'Please change your password the first time you sign in.',
  ].join('\n')

  return { subject: 'Your ArchFacing employee account', html, text }
}
