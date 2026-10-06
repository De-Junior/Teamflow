import { describe, expect, it } from "vitest";
import { timeAgo } from "./time-ago";

const now = new Date("2026-10-06T12:00:00Z");
const before = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe("timeAgo", () => {
  it("says just now for under a minute", () => {
    expect(timeAgo(before(30), now)).toBe("just now");
  });

  it("uses the largest whole unit", () => {
    expect(timeAgo(before(5 * 60), now)).toBe("5 minutes ago");
    expect(timeAgo(before(3 * 60 * 60), now)).toBe("3 hours ago");
    expect(timeAgo(before(24 * 60 * 60), now)).toBe("yesterday");
    expect(timeAgo(before(14 * 24 * 60 * 60), now)).toBe("2 weeks ago");
  });
});
