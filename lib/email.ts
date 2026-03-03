/// lib/email.ts
export type EmailTemplate =
  | "protocol_ready"
  | "weekly_checkin_reminder"
  | "re_engagement"
  | "export_confirmation";

interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  data?: Record<string, unknown>;
}

const SUBJECTS: Record<EmailTemplate, string> = {
  protocol_ready: "Your Blue Zone protocol is ready",
  weekly_checkin_reminder: "Time for your weekly Blue Zone check-in",
  re_engagement: "Your longevity protocol is waiting for you",
  export_confirmation: "Your Blue Zone data export",
};

function buildHtml(template: EmailTemplate, data: Record<string, unknown> = {}): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const wrap = (body: string) => `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="background:#0080cc;color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:14px">Blue Zone</span>
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#bbb;font-size:11px">Blue Zone is not a medical service. All insights are for educational purposes only.</p>
    </div>`;

  switch (template) {
    case "protocol_ready":
      return wrap(`
        <h2 style="color:#111">Your protocol is ready 🎉</h2>
        <p style="color:#444">Your personalized longevity protocol has been generated. Click below to view your results.</p>
        <a href="${base}/app/results/${data.protocolId}" style="display:inline-block;background:#0080cc;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">View my protocol</a>`);
    case "weekly_checkin_reminder":
      return wrap(`
        <h2 style="color:#111">Weekly check-in time 📋</h2>
        <p style="color:#444">It's been 7 days since your last check-in. Track your adherence and update your metrics.</p>
        <a href="${base}/app/dashboard" style="display:inline-block;background:#0080cc;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Check in now</a>`);
    case "re_engagement":
      return wrap(`
        <h2 style="color:#111">We miss you 👋</h2>
        <p style="color:#444">You haven't visited Blue Zone in a while. Your longevity protocol is still there, ready to guide you.</p>
        <a href="${base}/app/dashboard" style="display:inline-block;background:#0080cc;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Return to my protocol</a>`);
    case "export_confirmation":
      return wrap(`
        <h2 style="color:#111">Data export complete ✅</h2>
        <p style="color:#444">Your Blue Zone data export is ready. Your data has been prepared as a JSON file for your records.</p>
        <a href="${base}/api/export" style="display:inline-block;background:#0080cc;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Download export</a>`);
  }
}

export async function sendEmail({ to, template, data = {} }: SendEmailOptions) {
  const subject = SUBJECTS[template];
  const html = buildHtml(template, data);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:mock] To: ${to} | Subject: ${subject}`);
    console.log(`[email:mock] Data:`, data);
    return { id: "mock" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject,
    html,
  });
}
