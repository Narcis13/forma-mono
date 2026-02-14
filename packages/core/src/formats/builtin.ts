import type { FormatDefinition } from "./registry.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const PHONE_RE = /^\+?[\d\s\-()]{7,}$/;

export const builtinFormats: Record<string, FormatDefinition> = {
  email: {
    validate: (v) => typeof v === "string" && EMAIL_RE.test(v),
    description: "Email address",
  },
  url: {
    validate: (v) => typeof v === "string" && URL_RE.test(v),
    description: "URL (http or https)",
  },
  uuid: {
    validate: (v) => typeof v === "string" && UUID_RE.test(v),
    description: "UUID v4",
  },
  date: {
    validate: (v) => typeof v === "string" && DATE_RE.test(v),
    description: "Date in YYYY-MM-DD format",
  },
  datetime: {
    validate: (v) => typeof v === "string" && DATETIME_RE.test(v),
    description: "ISO 8601 datetime",
  },
  phone: {
    validate: (v) => typeof v === "string" && PHONE_RE.test(v),
    description: "Phone number (international or local)",
  },
};
