import { Hono } from "hono";
import type { StorageAdapter } from "./storage/interface.js";
import { formsRoutes } from "./routes/forms.js";
import { submissionsRoutes } from "./routes/submissions.js";

export interface FormaServerOptions {
  storage: StorageAdapter;
}

export function createFormaServer(opts: FormaServerOptions) {
  const app = new Hono();
  app.route("/forms", formsRoutes(opts.storage));
  app.route("/forms", submissionsRoutes(opts.storage));
  return app;
}
