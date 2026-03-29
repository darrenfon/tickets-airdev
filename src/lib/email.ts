import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL || "Tickets <tickets@airdev.us>";
}

export async function sendTicketCreatedEmail({
  to,
  ticketSubject,
  tenantName,
}: {
  to: string;
  ticketSubject: string;
  tenantName: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: getFrom(),
    to,
    subject: `New ticket: ${ticketSubject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">New Support Ticket</h2>
        <p>A new ticket has been created for <strong>${tenantName}</strong>:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">${ticketSubject}</p>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #10b981;">View in Dashboard</a></p>
      </div>
    `,
  });
}

export async function sendTicketReplyEmail({
  to,
  ticketSubject,
  replyAuthor,
  replyPreview,
}: {
  to: string;
  ticketSubject: string;
  replyAuthor: string;
  replyPreview: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: getFrom(),
    to,
    subject: `Re: ${ticketSubject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">New Reply</h2>
        <p><strong>${replyAuthor}</strong> replied to: <strong>${ticketSubject}</strong></p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">${replyPreview}</p>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #10b981;">View in Dashboard</a></p>
      </div>
    `,
  });
}

export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: getFrom(),
    to,
    subject: "Sign in to AirDev Tickets",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Sign in to AirDev Tickets</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes.</p>
        <a href="${url}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Sign In</a>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
