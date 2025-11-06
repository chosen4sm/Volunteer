import { NextRequest, NextResponse } from "next/server";
import { sendAssignmentNotification, SendAssignmentEmailParams } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignments } = body as { assignments: SendAssignmentEmailParams[] };

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: assignments array required" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      assignments.map((assignment) => sendAssignmentNotification(assignment))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");

    return NextResponse.json({
      success: true,
      total: assignments.length,
      successful,
      failed,
      errors: failed > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in send-assignment-email route:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}









