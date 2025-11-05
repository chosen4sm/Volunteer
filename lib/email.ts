import { Resend } from "resend";
import { AssignmentNotificationEmail } from "@/emails/assignment-notification";

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function sendAssignmentNotification(params: SendAssignmentEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const hasMultipleAssignments = params.assignments && params.assignments.length > 1;
  const subject = hasMultipleAssignments
    ? `USA Visit - ${params.assignments!.length} Volunteer Assignments`
    : params.assignments && params.assignments.length === 1
    ? `USA Visit Volunteer Assignment: ${params.assignments[0].taskName}`
    : `USA Visit Volunteer Assignment${params.taskName ? `: ${params.taskName}` : ''}`;

  try {
    const { data, error } = await resend.emails.send({
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


