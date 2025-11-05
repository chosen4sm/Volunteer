import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

function formatTime(time?: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
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

interface AssignmentNotificationEmailProps {
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
  baseUrl: string;
}

export const AssignmentNotificationEmail = ({
  volunteerName = "John Doe",
  taskName = "Setup",
  locationName,
  day,
  shift,
  startTime,
  endTime,
  description,
  assignments,
  uniqueCode = "ABC12345",
  baseUrl = "https://example.com",
}: AssignmentNotificationEmailProps) => {
  const volunteerPortalUrl = `${baseUrl}/volunteer/${uniqueCode}`;
  
  const getScheduleText = (assignmentData: { day?: string; shift?: string; startTime?: string; endTime?: string }) => {
    if (assignmentData.startTime || assignmentData.endTime) {
      const timeStr = [assignmentData.startTime, assignmentData.endTime]
        .filter(Boolean)
        .map(t => formatTime(t))
        .join(" - ");
      if (assignmentData.day) {
        return `${assignmentData.day} ${timeStr}`;
      }
      return timeStr;
    }
    if (assignmentData.day && assignmentData.shift) {
      return `${assignmentData.day} - ${assignmentData.shift}`;
    }
    return assignmentData.day || assignmentData.shift || "To be scheduled";
  };
  
  const displayAssignments = assignments && assignments.length > 0 
    ? assignments 
    : [{ taskName: taskName!, locationName, day, shift, startTime, endTime, description }];
  
  const hasMultipleAssignments = displayAssignments.length > 1;

  return (
    <Html>
      <Head />
      <Preview>USA Visit - {hasMultipleAssignments ? `Your ${displayAssignments.length} volunteer assignments` : `Your volunteer assignment${displayAssignments[0]?.taskName ? ` for ${displayAssignments[0].taskName}` : ''}`}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "rgb(115, 70, 213)",
                primaryLight: "rgb(147, 112, 219)",
                primaryDark: "rgb(91, 44, 189)",
                background: "rgb(254, 252, 254)",
                foreground: "rgb(0, 0, 0)",
                muted: "rgb(247, 244, 247)",
                mutedForeground: "rgb(112, 112, 112)",
                border: "rgb(237, 231, 239)",
                accent: "rgb(239, 231, 244)",
              },
            },
          },
        }}
      >
        <Body style={{ 
          backgroundColor: "#fafafa", 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: 0,
        }}>
          <Container style={{ 
            maxWidth: "600px", 
            margin: "40px auto",
            padding: "0 20px",
          }}>
            {/* Main Card */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)",
            }}>
              {/* Gradient Header with Animation Feel */}
              <div style={{
                background: "linear-gradient(135deg, rgb(115, 70, 213) 0%, rgb(147, 112, 219) 50%, rgb(138, 80, 226) 100%)",
                padding: "40px 32px",
                position: "relative",
              }}>
                <div style={{
                  fontSize: "32px",
                  marginBottom: "4px",
                }}>
                  🎯
                </div>
                <Heading style={{
                  color: "#ffffff",
                  fontSize: "28px",
                  fontWeight: "700",
                  margin: "0",
                  letterSpacing: "-0.025em",
                }}>
                  USA Visit Volunteer Assignment
                </Heading>
                <Text style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  margin: "8px 0 0 0",
                  fontWeight: "400",
                }}>
                  Your service assignment details
                </Text>
              </div>

              {/* Content Section */}
              <Section style={{ padding: "40px 32px" }}>
                <Text style={{
                  color: "#000000",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0 0 24px 0",
                }}>
                  Hi <strong style={{ fontWeight: "600" }}>{volunteerName}</strong>,
                </Text>

                <Text style={{
                  color: "#000000",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0 0 32px 0",
                }}>
                  Thank you for volunteering with USA Visit! {hasMultipleAssignments ? `You have ${displayAssignments.length} assignments.` : 'You have been assigned to a service opportunity.'} Please review your assignment details below:
                </Text>

                {/* Details Cards */}
                {displayAssignments.map((assignment, index) => (
                  <div key={index} style={{
                    backgroundColor: "#f7f4f7",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "24px",
                    border: "1px solid #ede7ef",
                  }}>
                    {hasMultipleAssignments && (
                      <Text style={{
                        color: "rgb(115, 70, 213)",
                        fontSize: "14px",
                        fontWeight: "600",
                        margin: "0 0 16px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        Assignment {index + 1}
                      </Text>
                    )}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{
                            color: "#707070",
                            fontSize: "14px",
                            fontWeight: "500",
                            paddingBottom: "12px",
                            paddingRight: "16px",
                            verticalAlign: "top",
                            width: "120px",
                          }}>
                            Task
                          </td>
                          <td style={{
                            color: "#000000",
                            fontSize: "16px",
                            fontWeight: "600",
                            paddingBottom: "12px",
                          }}>
                            {assignment.taskName}
                          </td>
                        </tr>
                        {assignment.locationName && (
                          <tr>
                            <td style={{
                              color: "#707070",
                              fontSize: "14px",
                              fontWeight: "500",
                              paddingBottom: "12px",
                              paddingRight: "16px",
                              verticalAlign: "top",
                            }}>
                              Location
                            </td>
                            <td style={{
                              color: "#000000",
                              fontSize: "16px",
                              fontWeight: "600",
                              paddingBottom: "12px",
                            }}>
                              {assignment.locationName}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td style={{
                            color: "#707070",
                            fontSize: "14px",
                            fontWeight: "500",
                            paddingBottom: assignment.description ? "12px" : "0",
                            paddingRight: "16px",
                            verticalAlign: "top",
                          }}>
                            Schedule
                          </td>
                          <td style={{
                            color: "#000000",
                            fontSize: "16px",
                            fontWeight: "600",
                            paddingBottom: assignment.description ? "12px" : "0",
                          }}>
                            {getScheduleText(assignment)}
                          </td>
                        </tr>
                        {assignment.description && (
                          <tr>
                            <td style={{
                              color: "#707070",
                              fontSize: "14px",
                              fontWeight: "500",
                              paddingRight: "16px",
                              verticalAlign: "top",
                            }}>
                              Notes
                            </td>
                            <td style={{
                              color: "#000000",
                              fontSize: "15px",
                              lineHeight: "1.6",
                            }}>
                              {assignment.description}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}

                <Text style={{
                  color: "#000000",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  margin: "0 0 32px 0",
                }}>
                  Please use your personal volunteer portal to check in when you arrive and check out when you complete your service. Your portal provides access to all your assignments and service history.
                </Text>

                {/* CTA Button */}
                <Section style={{ textAlign: "center", margin: "0 0 32px 0" }}>
                  <Button
                    href={volunteerPortalUrl}
                    style={{
                      background: "linear-gradient(135deg, rgb(115, 70, 213) 0%, rgb(147, 112, 219) 100%)",
                      color: "#ffffff",
                      padding: "16px 40px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      fontSize: "16px",
                      textDecoration: "none",
                      display: "inline-block",
                      boxShadow: "0 4px 6px rgba(115, 70, 213, 0.2)",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    Open Volunteer Portal →
                  </Button>
                </Section>

                <Hr style={{
                  border: "none",
                  borderTop: "1px solid #ede7ef",
                  margin: "32px 0",
                }} />

                {/* Portal Link */}
                <div style={{
                  backgroundColor: "#efe7f4",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "16px",
                }}>
                  <Text style={{
                    color: "#707070",
                    fontSize: "12px",
                    fontWeight: "500",
                    margin: "0 0 6px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    Your Portal Link
                  </Text>
                  <a
                    href={volunteerPortalUrl}
                    style={{
                      color: "rgb(115, 70, 213)",
                      fontSize: "14px",
                      wordBreak: "break-all",
                      textDecoration: "none",
                      fontWeight: "500",
                    }}
                  >
                    {volunteerPortalUrl}
                  </a>
                </div>

                <Text style={{
                  color: "#707070",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  margin: "0",
                }}>
                  💡 <strong style={{ fontWeight: "600" }}>Important:</strong> Save this link for easy access to your volunteer dashboard and to check in for your assignments.
                </Text>
              </Section>

              {/* Footer */}
              <div style={{
                backgroundColor: "#f7f4f7",
                padding: "24px 32px",
                textAlign: "center",
              }}>
                <Text style={{
                  color: "#707070",
                  fontSize: "14px",
                  margin: "0",
                }}>
                  Thank you for your service at USA Visit! 🙏
                </Text>
                <Text style={{
                  color: "#a0a0a0",
                  fontSize: "12px",
                  margin: "8px 0 0 0",
                }}>
                  Questions? Reply to this email or contact the volunteer coordinator
                </Text>
              </div>
            </div>

            {/* Bottom Spacing */}
            <Text style={{
              color: "#a0a0a0",
              fontSize: "12px",
              textAlign: "center",
              margin: "24px 0 0 0",
            }}>
              This email was sent to you because you registered as a USA Visit volunteer. 
              You are receiving this because you signed up to help with volunteer services.
            </Text>
            
            <Text style={{
              color: "#b0b0b0",
              fontSize: "11px",
              textAlign: "center",
              margin: "12px 0 0 0",
            }}>
              Volunteer management powered by{" "}
              <a 
                href="https://ismailiseva.com" 
                style={{ 
                  color: "rgb(115, 70, 213)", 
                  textDecoration: "none",
                  fontWeight: "500"
                }}
              >
                ismailiseva.com
              </a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AssignmentNotificationEmail;
