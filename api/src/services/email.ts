import { Resend } from 'resend'
import { getWelcomeEmailTemplate } from './templates/welcome'
import { getPasswordResetEmailTemplate } from './templates/passwordReset'
import { getSecurityAlertEmailTemplate } from './templates/securityAlert'

export interface SentEmailRecord {
  to: string
  subject: string
  html: string
  code?: string
  type: 'verification' | 'password_reset' | 'security_alert'
  timestamp: Date
}

const sentEmailsStore: SentEmailRecord[] = []

export const getSentEmails = (): SentEmailRecord[] => [...sentEmailsStore]

export const clearSentEmails = (): void => {
  sentEmailsStore.length = 0
}

const getSenderEmail = (): string => {
  return process.env.EMAIL_FROM || 'Dinheirizz <onboarding@resend.dev>'
}

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || process.env.NODE_ENV === 'test') {
    return null
  }
  return new Resend(apiKey)
}

export interface SendVerificationEmailParams {
  to: string
  code: string
  name?: string
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

export const sendVerificationEmail = async ({
  to,
  code,
  name
}: SendVerificationEmailParams): Promise<EmailResult> => {
  const subject = `${code} é o seu código de verificação — Dinheirizz`
  const html = getWelcomeEmailTemplate({ name, code })

  sentEmailsStore.push({
    to,
    subject,
    html,
    code,
    type: 'verification',
    timestamp: new Date()
  })

  const resend = getResendClient()
  if (!resend) {
    return { success: true, id: `mock-${Date.now()}` }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getSenderEmail(),
      to,
      subject,
      html
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha ao enviar e-mail de verificação'
    return { success: false, error: errorMessage }
  }
}

export interface SendPasswordResetEmailParams {
  to: string
  code: string
  name?: string
}

export const sendPasswordResetEmail = async ({
  to,
  code,
  name
}: SendPasswordResetEmailParams): Promise<EmailResult> => {
  const subject = `${code} é o seu código de recuperação de senha — Dinheirizz`
  const html = getPasswordResetEmailTemplate({ name, code })

  sentEmailsStore.push({
    to,
    subject,
    html,
    code,
    type: 'password_reset',
    timestamp: new Date()
  })

  const resend = getResendClient()
  if (!resend) {
    return { success: true, id: `mock-${Date.now()}` }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getSenderEmail(),
      to,
      subject,
      html
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha ao enviar e-mail de recuperação'
    return { success: false, error: errorMessage }
  }
}

export interface SendSecurityAlertEmailParams {
  to: string
  alertType: string
  details: string
  name?: string
}

export const sendSecurityAlertEmail = async ({
  to,
  alertType,
  details,
  name
}: SendSecurityAlertEmailParams): Promise<EmailResult> => {
  const subject = `Alerta de Segurança: ${alertType} — Dinheirizz`
  const html = getSecurityAlertEmailTemplate({ name, alertType, details })

  sentEmailsStore.push({
    to,
    subject,
    html,
    type: 'security_alert',
    timestamp: new Date()
  })

  const resend = getResendClient()
  if (!resend) {
    return { success: true, id: `mock-${Date.now()}` }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getSenderEmail(),
      to,
      subject,
      html
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha ao enviar alerta de segurança'
    return { success: false, error: errorMessage }
  }
}
