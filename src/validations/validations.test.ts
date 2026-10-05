import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";
import { createLabelSchema, createTimeEntrySchema, updateSubtaskSchema } from "./task-items";
import { isDemoAccount } from "@/lib/demo";

describe("auth schemas", () => {
  it("normalises email casing and whitespace on login", () => {
    const parsed = loginSchema.parse({ email: "  Ava@Example.COM ", password: "x" });
    expect(parsed.email).toBe("ava@example.com");
  });

  it("requires a strong password and matching confirmation on register", () => {
    const base = { name: "Ava", email: "ava@example.com" };
    expect(registerSchema.safeParse({ ...base, password: "weakpass", confirmPassword: "weakpass" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "Strong123", confirmPassword: "Strong124" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "Strong123", confirmPassword: "Strong123" }).success).toBe(true);
  });
});

describe("task item schemas", () => {
  it("rejects a subtask update with nothing to change", () => {
    expect(updateSubtaskSchema.safeParse({}).success).toBe(false);
    expect(updateSubtaskSchema.safeParse({ completed: true }).success).toBe(true);
  });

  it("only accepts hex label colours", () => {
    expect(createLabelSchema.safeParse({ name: "bug", color: "#ef4444" }).success).toBe(true);
    expect(createLabelSchema.safeParse({ name: "bug", color: "red; background:url(x)" }).success).toBe(false);
  });

  it("bounds time entries to a single day", () => {
    expect(createTimeEntrySchema.safeParse({ minutes: 0 }).success).toBe(false);
    expect(createTimeEntrySchema.safeParse({ minutes: "90" }).data?.minutes).toBe(90);
    expect(createTimeEntrySchema.safeParse({ minutes: 24 * 60 + 1 }).success).toBe(false);
  });
});

describe("demo account detection", () => {
  it("matches the demo email case-insensitively", () => {
    expect(isDemoAccount("Recruiter@TeamFlow-Demo.com")).toBe(true);
    expect(isDemoAccount("someone@else.com")).toBe(false);
    expect(isDemoAccount(undefined)).toBe(false);
  });
});
