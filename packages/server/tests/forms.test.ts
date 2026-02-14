import { describe, expect, test, beforeEach } from "bun:test";
import { createFormaServer } from "../src/index.js";
import { InMemoryStorage } from "../src/storage/memory.js";

describe("Form CRUD routes", () => {
  let app: ReturnType<typeof createFormaServer>;

  beforeEach(() => {
    app = createFormaServer({ storage: new InMemoryStorage() });
  });

  const formPayload = {
    id: "test-form",
    version: 1,
    name: "Test Form",
    description: "A test form",
    fields: [
      { id: "name", type: "text", label: "Name", required: true },
    ],
  };

  test("POST /forms creates a form", async () => {
    const res = await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("test-form");
  });

  test("GET /forms lists all forms", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  test("GET /forms/:id returns a form", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms/test-form");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("test-form");
  });

  test("GET /forms/:id returns 404 for missing form", async () => {
    const res = await app.request("/forms/nonexistent");
    expect(res.status).toBe(404);
  });

  test("PUT /forms/:id updates a form", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const updated = { ...formPayload, description: "Updated" };
    const res = await app.request("/forms/test-form", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("Updated");
  });

  test("DELETE /forms/:id deletes a form", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms/test-form", { method: "DELETE" });
    expect(res.status).toBe(204);

    const getRes = await app.request("/forms/test-form");
    expect(getRes.status).toBe(404);
  });

  test("GET /forms/:id/describe returns introspection", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms/test-form/describe");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.purpose).toBe("A test form");
    expect(body.requiredFields).toEqual(["name"]);
  });

  test("GET /forms/:id/tool-schema returns Claude format by default", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms/test-form/tool-schema");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("submit_test-form");
    expect(body.input_schema).toBeDefined();
  });

  test("GET /forms/:id/tool-schema?format=openai returns OpenAI format", async () => {
    await app.request("/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });
    const res = await app.request("/forms/test-form/tool-schema?format=openai");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("function");
    expect(body.function.name).toBe("submit_test-form");
  });
});
