import { Resend } from "resend";

type TrialNotifyInput = {
  to: string;
  studioName: string;
  trialEmail: string;
  studioSlug: string;
};

export async function sendTrialSignupEmail(input: TrialNotifyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "FreePass <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(
      `[email-skipped] Trial signup for ${input.studioName}: ${input.trialEmail} (set RESEND_API_KEY to enable)`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `New free trial signup — ${input.studioName}`,
    text: [
      `Someone signed up for a free trial at ${input.studioName}.`,
      "",
      `Email: ${input.trialEmail}`,
      "",
      `View your studio: ${appUrl}/studios/${input.studioSlug}`,
      `Manage schedule: ${appUrl}/studios/${input.studioSlug}/manage`,
    ].join("\n"),
  });

  if (error) {
    console.error("trial_email_failed", error);
  }
}
