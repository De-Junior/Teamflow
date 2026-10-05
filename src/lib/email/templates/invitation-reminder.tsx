import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface InvitationReminderEmailProps {
  organizationName: string;
  role: string;
  inviteUrl: string;
}

export function InvitationReminderEmail({ organizationName, role, inviteUrl }: InvitationReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your invitation to {organizationName} is still waiting</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reminder: your invitation is waiting</Heading>
          <Text style={text}>
            You have a pending invitation to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
          </Text>
          <Button style={button} href={inviteUrl}>
            Accept invitation
          </Button>
          <Text style={footer}>This invitation now expires in 7 days from today.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f6f9fc", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { margin: "0 auto", padding: "40px 20px", maxWidth: "480px" };
const heading = { fontSize: "22px", color: "#111827" };
const text = { fontSize: "15px", color: "#374151", lineHeight: "24px" };
const button = { backgroundColor: "#6366f1", borderRadius: "6px", color: "#fff", fontSize: "15px", padding: "12px 20px", textDecoration: "none", display: "inline-block", marginTop: "12px" };
const footer = { fontSize: "13px", color: "#9ca3af", marginTop: "24px" };