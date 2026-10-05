import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

interface TaskAssignedEmailProps {
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  projectName: string;
  taskUrl: string;
}

export function TaskAssignedEmail({ assigneeName, assignerName, taskTitle, projectName, taskUrl }: TaskAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{assignerName} assigned you a task in {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;ve got a new task</Heading>
          <Text style={text}>
            Hi {assigneeName}, {assignerName} assigned you <strong>&quot;{taskTitle}&quot;</strong> in <strong>{projectName}</strong>.
          </Text>
          <Button style={button} href={taskUrl}>
            View task
          </Button>
          <Text style={footer}>
            You&apos;re receiving this because you&apos;re a member of {projectName} on TeamFlow.
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