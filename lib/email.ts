import { Resend } from "resend";
import { AssignmentNotificationEmail } from "@/emails/assignment-notification";

let resendInstance: Resend | null = null;

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

interface AssignmentDetail {
  taskName: string;
  locationName?: string;
  day?: string;
  shift?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
}

export interface SendAssignmentEmailParams {
  to: string;
  volunteerName: string;
  taskName?: string;
  locationName?: string;
  day?: string;
  shift?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  assignments?: AssignmentDetail[];
  uniqueCode: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmailWithRetry(
  emailParams: {
    from: string;
    to: string | string[];
    subject: string;
    react: React.ReactElement;
    replyTo?: string;
  },
  maxRetries = 3
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resend = getResend();
      const result = await resend.emails.send(emailParams);
      
      if (result.error) {
        if (result.error.message?.includes('429') || result.error.message?.includes('rate limit')) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
            continue;
          }
        }
        return result;
      }
      
      return result;
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      if (attempt < maxRetries - 1 && (err.statusCode === 429 || err.message?.includes('rate limit'))) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function sendAssignmentNotification(params: SendAssignmentEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const hasMultipleAssignments = params.assignments && params.assignments.length > 1;
  const subject = hasMultipleAssignments
    ? `USA Visit - ${params.assignments!.length} Volunteer Assignments`
    : params.assignments && params.assignments.length === 1
    ? `USA Visit Volunteer Assignment: ${params.assignments[0].taskName}`
    : `USA Visit Volunteer Assignment${params.taskName ? `: ${params.taskName}` : ''}`;

  try {
    const { data, error } = await sendEmailWithRetry({
      from: "USA Visit Volunteer Team <noreply@notify.ismailiseva.com>",
      replyTo: "ismailiseva@gmail.com",
      to: params.to,
      subject,
      react: AssignmentNotificationEmail({
        volunteerName: params.volunteerName,
        taskName: params.taskName,
        locationName: params.locationName,
        day: params.day,
        shift: params.shift,
        startTime: params.startTime,
        endTime: params.endTime,
        description: params.description,
        assignments: params.assignments,
        uniqueCode: params.uniqueCode,
        baseUrl,
      }),
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send assignment email:", error);
    throw error;
  }
}

export async function sendBulkAssignmentNotifications(
  assignments: SendAssignmentEmailParams[]
) {
  const results = await Promise.allSettled(
    assignments.map((assignment) => sendAssignmentNotification(assignment))
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    total: assignments.length,
    successful,
    failed,
  };
}


