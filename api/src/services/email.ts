import { Resend } from 'resend'
import { getWelcomeEmailTemplate } from './templates/welcome'
import { getPasswordResetEmailTemplate } from './templates/passwordReset'
import { getSecurityAlertEmailTemplate } from './templates/securityAlert'
import { isProductionEnv, type RuntimeEnv } from '../lib/env'

export type RuntimeEmailEnv = Pick<
  RuntimeEnv,
  'RESEND_API_KEY' | 'EMAIL_FROM' | 'ENVIRONMENT' | 'NODE_ENV'
>

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

interface ResolvedEmailConfig {
  apiKey?: string
  from: string
  isProduction: boolean
  isTest: boolean
}

const resolveEmailConfig = (env?: RuntimeEmailEnv): ResolvedEmailConfig => {
  const apiKey = env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY
  const from = env?.EMAIL_FROM ?? process.env.EMAIL_FROM ?? 'Dinheirizz <onboarding@resend.dev>'
  const isProduction = isProductionEnv(env)
  const isTest = (env?.NODE_ENV ?? process.env.NODE_ENV) === 'test'

  return { apiKey, from, isProduction, isTest }
}

const sendWithResend = async (
  params: { to: string; subject: string; html: string; fallbackError: string },
  env?: RuntimeEmailEnv
): Promise<EmailResult> => {
  const { apiKey, from, isProduction, isTest } = resolveEmailConfig(env)

  if (isProduction) {
    if (!apiKey) {
      return {
        success: false,
        error: 'Serviço de e-mail não configurado (RESEND_API_KEY ausente).'
      }
    }
  } else if (isTest || !apiKey) {
    return { success: true, id: `mock-${Date.now()}` }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : params.fallbackError
    return { success: false, error: errorMessage }
  }
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

export const sendVerificationEmail = async (
  { to, code, name }: SendVerificationEmailParams,
  env?: RuntimeEmailEnv
): Promise<EmailResult> => {
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

  return sendWithResend(
    { to, subject, html, fallbackError: 'Falha ao enviar e-mail de verificação' },
    env
  )
}

export interface SendPasswordResetEmailParams {
  to: string
  code: string
  name?: string
}

export const sendPasswordResetEmail = async (
  { to, code, name }: SendPasswordResetEmailParams,
  env?: RuntimeEmailEnv
): Promise<EmailResult> => {
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

  return sendWithResend(
    { to, subject, html, fallbackError: 'Falha ao enviar e-mail de recuperação' },
    env
  )
}

export interface SendSecurityAlertEmailParams {
  to: string
  alertType: string
  details: string
  name?: string
}

export const sendSecurityAlertEmail = async (
  { to, alertType, details, name }: SendSecurityAlertEmailParams,
  env?: RuntimeEmailEnv
): Promise<EmailResult> => {
  const subject = `Alerta de Segurança: ${alertType} — Dinheirizz`
  const html = getSecurityAlertEmailTemplate({ name, alertType, details })

  sentEmailsStore.push({
    to,
    subject,
    html,
    type: 'security_alert',
    timestamp: new Date()
  })

  return sendWithResend(
    { to, subject, html, fallbackError: 'Falha ao enviar alerta de segurança' },
    env
  )
}
