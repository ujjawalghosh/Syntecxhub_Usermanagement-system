import nodemailer from 'nodemailer'

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })
}

export async function sendInvitationEmail({ name, email, temporaryPassword }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('Email service is not configured. Invitation created without sending email.')
    return { sent: false, reason: 'SMTP not configured' }
  }

  const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173'
  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  await transporter.sendMail({
    from,
    to: email,
    subject: 'You have been invited to Lumina',
    text: `Hi ${name},\n\nYou have been invited to join your company workspace on Lumina.\n\nSign in: ${clientUrl}\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease change your password after signing in.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#263238"><h2>You are invited to Lumina</h2><p>Hi ${name},</p><p>You have been invited to join your company workspace.</p><p><a href="${clientUrl}" style="background:#2c8e6d;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block">Sign in to Lumina</a></p><p><strong>Email:</strong> ${email}<br><strong>Temporary password:</strong> ${temporaryPassword}</p><p style="color:#71807b;font-size:12px">Please change your password after signing in.</p></div>`
  })

  return { sent: true }
}
