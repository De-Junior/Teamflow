import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email for TeamFlow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to TeamFlow, {name}</Heading>
          <Text style={text}>Please verify your email address to finish setting up your account.</Text>
          <Button style={button} href={verifyUrl}>
            Verify email
          </Button>
          <Text style={footer}>If you didn&apos;t create this account, you can safely ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f6f9fc", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { margin: "0 auto", padding: "40px 20px", maxWidth: "480px" };
const heading = { fontSize: "22px", color: "#111827" };
const text = { fontSize: "15px", color: "#374151", lineHeight: "24px" };
const button = { backgroundColor: "#16a34a", borderRadius: "6px", color: "#fff", fontSize: "15px", padding: "12px 20px", textDecoration: "none", display: "inline-block", marginTop: "12px" };
const footer = { fontSize: "13px", color: "#9ca3af", marginTop: "24px" };