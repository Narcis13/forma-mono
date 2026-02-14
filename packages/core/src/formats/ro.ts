import type { FormatDefinition } from "./registry.js";

const CUI_RE = /^(RO)?\d{2,10}$/;
const CNP_RE = /^\d{13}$/;
const PHONE_RO_RE = /^(\+40|0)(2\d{8}|7\d{8})$/;

export const roFormats: Record<string, FormatDefinition> = {
  cui: {
    validate: (v) => typeof v === "string" && CUI_RE.test(v),
    description: "Romanian CUI (Cod Unic de Identificare). Examples: RO12345678, 44556677",
  },
  cnp: {
    validate: (v) => typeof v === "string" && CNP_RE.test(v),
    description: "Romanian CNP (Cod Numeric Personal) — 13 digit personal ID number",
  },
  "phone-ro": {
    validate: (v) => typeof v === "string" && PHONE_RO_RE.test(v),
    description: "Romanian phone number. Mobile: 07xx, Landline: 02x. Optional +40 prefix",
  },
};
