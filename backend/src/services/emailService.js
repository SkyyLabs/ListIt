const {
  FRONTEND_ORIGIN,
  INVITE_FROM_EMAIL,
  RESEND_API_KEY
} = require('../config/env');

async function sendInvitationEmail({ email, inviteUrl, listTitle }) {
  if (!RESEND_API_KEY) {
    console.warn(`Invite email not sent. Configure RESEND_API_KEY. Invite link: ${inviteUrl}`);
    return { skipped: true, inviteUrl };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: INVITE_FROM_EMAIL,
      to: [email],
      subject: `You're invited to collaborate on ${listTitle}`,
      html: [
        '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">',
        '<h1 style="font-size:22px">ListIt invitation</h1>',
        `<p>You have been invited to collaborate on <strong>${escapeHtml(listTitle)}</strong>.</p>`,
        `<p><a href="${inviteUrl}" style="display:inline-block;background:#020617;color:white;padding:10px 16px;border-radius:999px;text-decoration:none">Accept invitation</a></p>`,
        '<p style="color:#64748b;font-size:13px">This invitation link expires automatically.</p>',
        '</div>'
      ].join('')
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send invitation email: ${body}`);
  }

  return response.json();
}

async function sendInvitationCanceledEmail({ email, listTitle }) {
  return sendNotificationEmail({
    email,
    subject: `Invitation canceled for ${listTitle || 'a ListIt list'}`,
    heading: 'Invitation canceled',
    messageHtml: `Your invitation to collaborate on <strong>${escapeHtml(listTitle || 'this list')}</strong> has been canceled.`
  });
}

async function sendCollaboratorRemovedEmail({ email, listTitle }) {
  return sendNotificationEmail({
    email,
    subject: `You were removed from ${listTitle || 'a ListIt list'}`,
    heading: 'Collaborator access removed',
    messageHtml: `You have been removed as a collaborator from <strong>${escapeHtml(listTitle || 'this list')}</strong>.`
  });
}

async function sendNotificationEmail({
  email,
  heading,
  messageHtml,
  subject
}) {
  if (!email) {
    console.warn(`Notification email not sent. Missing recipient for: ${subject}`);
    return { skipped: true };
  }

  if (!RESEND_API_KEY) {
    console.warn(`Notification email not sent. Configure RESEND_API_KEY. Recipient: ${email}`);
    return { skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: INVITE_FROM_EMAIL,
      to: [email],
      subject,
      html: [
        '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">',
        `<h1 style="font-size:22px">${escapeHtml(heading)}</h1>`,
        `<p>${messageHtml}</p>`,
        '<p style="color:#64748b;font-size:13px">This is an automated ListIt notification.</p>',
        '</div>'
      ].join('')
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send notification email: ${body}`);
  }

  return response.json();
}

function buildInviteUrl(token) {
  return `${FRONTEND_ORIGIN}/invites/${token}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

module.exports = {
  buildInviteUrl,
  sendCollaboratorRemovedEmail,
  sendInvitationEmail,
  sendInvitationCanceledEmail
};
