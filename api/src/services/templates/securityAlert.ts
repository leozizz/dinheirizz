export interface SecurityAlertEmailProps {
  name?: string
  alertType: string
  details: string
}

export const getSecurityAlertEmailTemplate = ({ name, alertType, details }: SecurityAlertEmailProps): string => {
  const greeting = name ? `Olá, ${name}!` : 'Olá!'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Segurança — Dinheirizz</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0C; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #18181B; border: 1px solid #EF4444; border-radius: 16px; padding: 36px; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.15);">
          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                Dinheir<span style="color: #CCFF00;">izz</span>
              </div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="color: #E4E4E7; font-size: 16px; line-height: 1.6; padding-bottom: 20px;">
              <h1 style="color: #EF4444; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">🛡️ Alerta de Segurança</h1>
              <p style="margin: 0 0 16px 0; color: #E4E4E7;">${greeting}</p>
              <p style="margin: 0 0 16px 0; color: #A1A1AA;">
                Identificamos uma atividade recente relevante na sua conta: <strong>${alertType}</strong>.
              </p>
            </td>
          </tr>
          <!-- Details Box -->
          <tr>
            <td style="padding: 12px 0 24px 0;">
              <div style="background-color: #0A0A0C; border: 1px solid #27272A; border-radius: 12px; padding: 16px 20px; color: #D4D4D8; font-size: 14px; line-height: 1.5;">
                ${details}
              </div>
            </td>
          </tr>
          <!-- Warning -->
          <tr>
            <td style="color: #A1A1AA; font-size: 14px; line-height: 1.5; padding-bottom: 24px; border-bottom: 1px solid #27272A;">
              <p style="margin: 0;">
                Se você não reconhece esta atividade, recomendamos acessar imediatamente sua conta e alterar sua senha.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; color: #71717A; font-size: 12px; line-height: 1.4;">
              <p style="margin: 0 0 4px 0;">Dinheirizz — Gestão Financeira Inteligente</p>
              <p style="margin: 0;">E-mail transacional automatizado de segurança. Por favor, não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
