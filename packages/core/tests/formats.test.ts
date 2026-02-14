import { describe, expect, test, beforeEach } from "bun:test";
import { FormatRegistry } from "@forma/core";

describe("FormatRegistry", () => {
  beforeEach(() => {
    FormatRegistry.reset();
    FormatRegistry.loadBuiltins();
  });

  test("register and retrieve a custom format", () => {
    FormatRegistry.register("test-fmt", {
      validate: (v) => typeof v === "string" && v.startsWith("TEST-"),
      description: "Test format",
    });
    const fmt = FormatRegistry.get("test-fmt");
    expect(fmt).toBeDefined();
    expect(fmt!.description).toBe("Test format");
    expect(fmt!.validate("TEST-123")).toBe(true);
    expect(fmt!.validate("NOPE")).toBe(false);
  });

  test("registerAll registers multiple formats", () => {
    FormatRegistry.registerAll({
      "fmt-a": { validate: () => true, description: "A" },
      "fmt-b": { validate: () => true, description: "B" },
    });
    expect(FormatRegistry.get("fmt-a")).toBeDefined();
    expect(FormatRegistry.get("fmt-b")).toBeDefined();
  });

  test("has returns true for registered format", () => {
    FormatRegistry.register("x", { validate: () => true, description: "X" });
    expect(FormatRegistry.has("x")).toBe(true);
    expect(FormatRegistry.has("nonexistent")).toBe(false);
  });

  test("builtin: email validates correctly", () => {
    const email = FormatRegistry.get("email")!;
    expect(email.validate("user@example.com")).toBe(true);
    expect(email.validate("not-an-email")).toBe(false);
    expect(email.validate("a@b.co")).toBe(true);
  });

  test("builtin: url validates correctly", () => {
    const url = FormatRegistry.get("url")!;
    expect(url.validate("https://example.com")).toBe(true);
    expect(url.validate("not a url")).toBe(false);
  });

  test("builtin: uuid validates correctly", () => {
    const uuid = FormatRegistry.get("uuid")!;
    expect(uuid.validate("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(uuid.validate("not-a-uuid")).toBe(false);
  });

  test("builtin: date validates YYYY-MM-DD", () => {
    const date = FormatRegistry.get("date")!;
    expect(date.validate("2026-02-15")).toBe(true);
    expect(date.validate("15/02/2026")).toBe(false);
    expect(date.validate("not-a-date")).toBe(false);
  });

  test("builtin: datetime validates ISO 8601", () => {
    const dt = FormatRegistry.get("datetime")!;
    expect(dt.validate("2026-02-15T10:30:00Z")).toBe(true);
    expect(dt.validate("2026-02-15")).toBe(false);
  });

  test("builtin: phone validates international format", () => {
    const phone = FormatRegistry.get("phone")!;
    expect(phone.validate("+40712345678")).toBe(true);
    expect(phone.validate("0712345678")).toBe(true);
    expect(phone.validate("abc")).toBe(false);
  });
});
