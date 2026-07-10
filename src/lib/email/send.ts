// PASTE LOCATION: src/lib/email/send.ts (new file)
import { prisma } from "@/lib/db/prisma";
import { EmailType } from "@prisma/client";
import { getResend, EMAIL_FROM } from "./client";
import { InvitationEmail } from "./templates/invitation";
import { InvitationReminderEmail } from "./templates/invitation-reminder";
import { PasswordResetEmail } from "./templates/password-reset";
import { VerifyEmail } from "./templates/verify-email";
import { TaskAssignedEmail } from "./templates/task-assigned";

type LogParams = {
  tenantId?: string | null;
  type: EmailType;
  to: string;
  resendId?: string | null;
  status: "SENT" | "FAILED";
  error?: string | null;
};

async function logEmail(params: LogParams) {
  try {
    await prisma.emailLog.create({
      data: {
        tenantId: params.tenantId ?? null,
        type: params.type,
        to: params.to,
        resendId: params.resendId ?? null,
        status: params.status,
        error: params.error ?? null,
      },
    });
  } catch (err) {
    // Logging failure should never break the calling flow.
    console.error("[EMAIL_LOG_ERROR]", err);
  }
}

/**
 * All send* functions below intentionally never throw. Email delivery is
 * best-effort: the calling route's primary action (creating an invitation,
 * issuing a reset token, registering a user) must succeed regardless of
 * whether the email provider is reachable. Failures are captured in
 * EmailLog for support/ops visibility instead.
 */

export async function sendTaskAssignedEmail(params: {
  tenantId: string;
  to: string;
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  projectName: string;
  taskUrl: string;
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `You were assigned "${params.taskTitle}" in ${params.projectName}`,
      react: TaskAssignedEmail({
        assigneeName: params.assigneeName,
        assignerName: params.assignerName,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
        taskUrl: params.taskUrl,
      }),
    });

    if (error) {
      await logEmail({ tenantId: params.tenantId, type: EmailType.TASK_ASSIGNED, to: params.to, status: "FAILED", error: error.message });
      return;
    }

    await logEmail({ tenantId: params.tenantId, type: EmailType.TASK_ASSIGNED, to: params.to, resendId: data?.id, status: "SENT" });
  } catch (err) {
    console.error("[SEND_TASK_ASSIGNED_EMAIL_ERROR]", err);
    await logEmail({ tenantId: params.tenantId, type: EmailType.TASK_ASSIGNED, to: params.to, status: "FAILED", error: (err as Error).message });
  }
}

export async function sendInvitationEmail(params: {
  tenantId: string;
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `You've been invited to join ${params.organizationName} on TeamFlow`,
      react: InvitationEmail({
        organizationName: params.organizationName,
        inviterName: params.inviterName,
        role: params.role,
        inviteUrl: params.inviteUrl,
      }),
    });

    if (error) {
      await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION, to: params.to, status: "FAILED", error: error.message });
      return;
    }

    await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION, to: params.to, resendId: data?.id, status: "SENT" });
  } catch (err) {
    console.error("[SEND_INVITATION_EMAIL_ERROR]", err);
    await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION, to: params.to, status: "FAILED", error: (err as Error).message });
  }
}

export async function sendInvitationReminderEmail(params: {
  tenantId: string;
  to: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: `Reminder: your invitation to ${params.organizationName} is waiting`,
      react: InvitationReminderEmail({
        organizationName: params.organizationName,
        role: params.role,
        inviteUrl: params.inviteUrl,
      }),
    });

    if (error) {
      await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION_REMINDER, to: params.to, status: "FAILED", error: error.message });
      return;
    }

    await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION_REMINDER, to: params.to, resendId: data?.id, status: "SENT" });
  } catch (err) {
    console.error("[SEND_INVITATION_REMINDER_ERROR]", err);
    await logEmail({ tenantId: params.tenantId, type: EmailType.INVITATION_REMINDER, to: params.to, status: "FAILED", error: (err as Error).message });
  }
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: "Reset your TeamFlow password",
      react: PasswordResetEmail({ resetUrl: params.resetUrl }),
    });

    if (error) {
      await logEmail({ type: EmailType.PASSWORD_RESET, to: params.to, status: "FAILED", error: error.message });
      return;
    }

    await logEmail({ type: EmailType.PASSWORD_RESET, to: params.to, resendId: data?.id, status: "SENT" });
  } catch (err) {
    console.error("[SEND_PASSWORD_RESET_EMAIL_ERROR]", err);
    await logEmail({ type: EmailType.PASSWORD_RESET, to: params.to, status: "FAILED", error: (err as Error).message });
  }
}

export async function sendVerificationEmail(params: { to: string; name: string; verifyUrl: string }) {
  try {
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: "Verify your email for TeamFlow",
      react: VerifyEmail({ name: params.name, verifyUrl: params.verifyUrl }),
    });

    if (error) {
      await logEmail({ type: EmailType.EMAIL_VERIFICATION, to: params.to, status: "FAILED", error: error.message });
      return;
    }

    await logEmail({ type: EmailType.EMAIL_VERIFICATION, to: params.to, resendId: data?.id, status: "SENT" });
  } catch (err) {
    console.error("[SEND_VERIFICATION_EMAIL_ERROR]", err);
    await logEmail({ type: EmailType.EMAIL_VERIFICATION, to: params.to, status: "FAILED", error: (err as Error).message });
  }
}
