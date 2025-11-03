import { Resend } from "resend";
import { AssignmentNotificationEmail } from "@/emails/assignment-notification";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendAssignmentEmailParams {
  to: string;
  volunteerName: string;
  taskName: string;
  locationName?: string;
  day?: string;
  shift?: string;
  description?: string;
  uniqueCode: string;
}

export async function sendAssignmentNotification(params: SendAssignmentEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const { data, error } = await resend.emails.send({
      from: "USA Visit Volunteer Team <onboarding@resend.dev>",
      replyTo: "ismailiseva@gmail.com",
      to: params.to,
      subject: `USA Visit Volunteer Assignment: ${params.taskName}`,
      react: AssignmentNotificationEmail({
        volunteerName: params.volunteerName,
        taskName: params.taskName,
        locationName: params.locationName,
        day: params.day,
        shift: params.shift,
        description: params.description,
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


