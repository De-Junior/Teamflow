import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your TeamFlow password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset your TeamFlow password. This link expires in 30 minutes.
          </Text>
          <Button style={button} href={resetUrl}>
            Reset password
          </Button>
          <Text style={footer}>
            If you didn&apos;t request this, you can safely ignore this email — your password won&apos;t change.
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
const button = { backgroundColor: "#dc2626", borderRadius: "6px", color: "#fff", fontSize: "15px", padding: "12px 20px", textDecoration: "none", display: "inline-block", marginTop: "12px" };
const footer = { fontSize: "13px", color: "#9ca3af", marginTop: "24px" };