// PASTE LOCATION: src/lib/email/templates/invitation.tsx (new file)
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export function InvitationEmail({ organizationName, inviterName, role, inviteUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {organizationName} on TeamFlow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re invited to TeamFlow</Heading>
          <Text style={text}>
            {inviterName} invited you to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
          </Text>
          <Button style={button} href={inviteUrl}>
            Accept invitation
          </Button>
          <Text style={footer}>
            This invitation expires in 7 days. If you weren&apos;t expecting this, you can safely ignore this email.
          </Text>
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