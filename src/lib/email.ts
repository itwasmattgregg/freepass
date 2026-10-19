import { Resend } from "resend";

type TrialNotifyInput = {
  to: string;
  studioName: string;
  trialEmail: string;
  studioSlug: string;
};

type MagicLinkInput = {
  to: string;
  url: string;
};

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return {
    client: new Resend(apiKey),
    from: process.env.EMAIL_FROM ?? "FreePass <onboarding@resend.dev>",
  };
}

export async function sendTrialSignupEmail(input: TrialNotifyInput): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.info(
      `[email-skipped] Trial signup for ${input.studioName}: ${input.trialEmail} (set RESEND_API_KEY to enable)`
    );
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await resend.client.emails.send({
    from: resend.from,
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

export async function sendMagicLinkEmail(input: MagicLinkInput): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.info(`[magic-link] ${input.to}: ${input.url}`);
    return;
  }

  const { error } = await resend.client.emails.send({
    from: resend.from,
    to: input.to,
    subject: "Your FreePass login link",
    text: [
      "Sign in to FreePass with this one-time link:",
      "",
      input.url,
      "",
      "This link expires in about an hour. If you did not request it, you can ignore this email.",
    ].join("\n"),
  });

  if (error) {
    console.error("magic_link_email_failed", error);
    throw new Error("Could not send login email");
  }
}
