import { describe, expect, test, beforeEach } from "bun:test";
import { createFormaServer } from "../src/index.js";
import { InMemoryStorage } from "../src/storage/memory.js";

describe("Submission routes", () => {
  let app: ReturnType<typeof createFormaServer>;

  const formPayload = {
    id: "test-form",
    version: 1,
    name: "Test",
    description: "Test",
    fields: [
      { id: "name", type: "text", label: "Name", required: true },
      { id: "email", type: "email", label: "Email", required: true, format: "email" },
    ],
  };

  beforeEach(async () => {
    app = createFormaServer({ storage: new InMemoryStorage() });
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
  });

  test("POST /forms/:id/submit validates and persists", async () => {
    const res = await app.request("/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.data.name).toBe("Alice");
  });

  test("POST /forms/:id/submit rejects invalid data", async () => {
    const res = await app.request("/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }), // missing email
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("email");
  });

  test("POST /forms/:id/validate dry-runs without persisting", async () => {
    const res = await app.request("/forms/test-form/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);

    // Verify nothing was persisted
    const subs = await app.request("/forms/test-form/submissions");
    const subList = await subs.json();
    expect(subList).toHaveLength(0);
  });

  test("POST /forms/:id/validate returns errors for invalid data", async () => {
    const res = await app.request("/forms/test-form/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("GET /forms/:id/submissions lists submissions", async () => {
    await app.request("/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "a@b.com" }),
    });
    await app.request("/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "b@c.com" }),
    });

    const res = await app.request("/forms/test-form/submissions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  test("GET /forms/:id/submissions/:sid returns single submission", async () => {
    const submitRes = await app.request("/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "a@b.com" }),
    });
    const { id } = await submitRes.json();

    const res = await app.request(`/forms/test-form/submissions/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Alice");
  });

  test("GET /forms/:id/submissions/:sid returns 404 for missing", async () => {
    const res = await app.request("/forms/test-form/submissions/nonexistent");
    expect(res.status).toBe(404);
  });

  test("POST /forms/:id/submit returns 404 for missing form", async () => {
    const res = await app.request("/forms/nonexistent/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });
    expect(res.status).toBe(404);
  });
});
