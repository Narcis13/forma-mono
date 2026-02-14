import { Hono } from "hono";
import { FormIntrospector, ToolSchemaGenerator } from "@forma/core";
import type { FormSchema } from "@forma/core";
import type { StorageAdapter } from "../storage/interface.js";

export function formsRoutes(storage: StorageAdapter) {
  const app = new Hono();

  app.get("/", async (c) => {
    const forms = await storage.listForms();
    return c.json(forms);
  });

  app.post("/", async (c) => {
    const body = await c.req.json<FormSchema>();
    await storage.saveForm(body);
    return c.json(body, 201);
  });

  app.get("/:id", async (c) => {
    const form = await storage.getForm(c.req.param("id"));
    if (!form) return c.json({ error: "Form not found" }, 404);
    return c.json(form);
  });

  app.put("/:id", async (c) => {
    const body = await c.req.json<FormSchema>();
    body.id = c.req.param("id");
    await storage.saveForm(body);
    return c.json(body);
  });

  app.delete("/:id", async (c) => {
    await storage.deleteForm(c.req.param("id"));
    return c.body(null, 204);
  });

  app.get("/:id/describe", async (c) => {
    const form = await storage.getForm(c.req.param("id"));
    if (!form) return c.json({ error: "Form not found" }, 404);
    return c.json(FormIntrospector.describe(form));
  });

  app.get("/:id/tool-schema", async (c) => {
    const form = await storage.getForm(c.req.param("id"));
    if (!form) return c.json({ error: "Form not found" }, 404);
    const format = c.req.query("format") ?? "claude";
    if (format === "openai") {
      return c.json(ToolSchemaGenerator.openai(form));
    }
    return c.json(ToolSchemaGenerator.claude(form));
  });

  return app;
}
