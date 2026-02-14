import { Hono } from "hono";
import { FormValidator } from "@forma/core";
import type { StorageAdapter, Submission } from "../storage/interface.js";

export function submissionsRoutes(storage: StorageAdapter) {
  const app = new Hono();

  app.post("/:id/validate", async (c) => {
    const form = await storage.getForm(c.req.param("id"));
    if (!form) return c.json({ error: "Form not found" }, 404);
    const data = await c.req.json();
    const result = FormValidator.validate(form, data);
    return c.json(result);
  });

  app.post("/:id/submit", async (c) => {
    const form = await storage.getForm(c.req.param("id"));
    if (!form) return c.json({ error: "Form not found" }, 404);
    const data = await c.req.json();
    const result = FormValidator.validate(form, data);
    if (!result.valid) {
      return c.json({ errors: result.errors }, 422);
    }
    const submission: Submission = {
      id: crypto.randomUUID(),
      formId: form.id,
      data: result.data,
      createdAt: new Date().toISOString(),
    };
    await storage.saveSubmission(form.id, submission);
    return c.json(submission, 201);
  });

  app.get("/:id/submissions", async (c) => {
    const subs = await storage.listSubmissions(c.req.param("id"));
    return c.json(subs);
  });

  app.get("/:id/submissions/:sid", async (c) => {
    const sub = await storage.getSubmission(c.req.param("id"), c.req.param("sid"));
    if (!sub) return c.json({ error: "Submission not found" }, 404);
    return c.json(sub);
  });

  return app;
}
