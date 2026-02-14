# Forma Design Document

**Date:** 2026-02-15
**Status:** Approved

## Overview

Forma is an agent-native form builder. Where traditional form builders (Typeform, Tally) optimize for human UX, Forma optimizes for agent DX — structured schemas, validation rules, and submission APIs that AI agents can discover, understand, and interact with programmatically.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary consumer | Standalone library | General-purpose, not tied to any specific product |
| Validation scope | Structural only (sync) | Pure, zero-dep core. Async checks are consumer's responsibility |
| Package scope | `@forma/*` | Short, memorable, matches repo name |
| Format handling | Core with registry | Universal formats built-in, locale packs (RO) opt-in via `addFormats()` |
| Tool schema output | Claude + OpenAI | Both formats from day one for broader adoption |
| Storage | Pluggable interface | `StorageAdapter` interface, ships `InMemoryStorage` as default |
| Architecture | 2 packages now, 3rd later | `@forma/core` + `@forma/server`. Defer `@forma/agent-sdk` until server complexity justifies it |

## Package: `@forma/core`

Pure TypeScript, zero dependencies. Works anywhere.

### Core Types

```typescript
interface FormSchema {
  id: string;
  version: number;
  name: string;
  description: string;           // Agent-readable purpose
  instructions?: string;         // How an agent should approach this form
  fields: FieldDefinition[];
  rules?: ConditionalRule[];
  metadata?: Record<string, unknown>;
}

interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: FieldOption[];       // select, radio, checkbox
  default?: unknown;
  dependsOn?: DependencyRule;    // conditional visibility
  examples?: unknown[];          // few-shot examples for agents
  format?: string;               // registered format name
}

type FieldType =
  | "text" | "textarea" | "number" | "boolean"
  | "select" | "multi-select" | "date" | "datetime"
  | "email" | "phone" | "url" | "file-ref"
  | "group" | "array" | "computed";
```

### FormBuilder (Fluent API)

```typescript
const form = FormBuilder.create("client-onboarding")
  .describe("Collect new client information")
  .instruct("Ask for CUI first, then auto-fill company details")
  .text("company_name", { required: true, label: "Company Name" })
  .select("company_type", { label: "Type", options: ["SRL", "SA", "PFA"] })
  .group("contact", (g) =>
    g.text("name", { required: true })
      .email("email", { required: true })
  )
  .array("associates", {
    label: "Associates",
    minItems: 1,
    fields: (item) => item.text("name").number("share_pct"),
  })
  .rule({ when: { field: "company_type", equals: "SA" }, then: { show: "board_members" } })
  .build();
```

Each method returns `this` for chaining. `.build()` returns a frozen `FormSchema`.

### FormValidator

`FormValidator.validate(schema, data)` returns `ValidationResult`:
- `{ valid: true, data: { ... } }` on success
- `{ valid: false, errors: FieldError[] }` on failure

`FieldError` includes `{ field, message, code }` — `code` is machine-readable so agents can programmatically fix issues.

Sync only. Checks types, required fields, regex patterns, min/max, registered format validators.

### Format Registry

```typescript
FormatRegistry.register("cui", { validate: (v) => ..., description: "Romanian CUI" });

// Built-in: email, url, phone, date, datetime, uuid
// Opt-in locale packs:
import { roFormats } from "@forma/core/formats/ro";
FormatRegistry.registerAll(roFormats); // CUI, CNP, phone-ro
```

### Tool Schema Generators

Pure transforms over `FormSchema`:

```typescript
ToolSchemaGenerator.claude(schema)  // -> Claude tool_use definition
ToolSchemaGenerator.openai(schema)  // -> OpenAI function calling definition
```

### FormIntrospector

```typescript
FormIntrospector.describe(schema)
// -> { purpose, requiredFields, optionalFields, fieldDetails, instructions }
```

Agent-readable structured description of a form.

## Package: `@forma/server`

Hono.js + Bun. Adds persistence, REST endpoints, multi-form management.

### Storage Interface

```typescript
interface StorageAdapter {
  getForm(id: string): Promise<FormSchema | null>;
  listForms(): Promise<FormSchema[]>;
  saveForm(schema: FormSchema): Promise<void>;
  deleteForm(id: string): Promise<void>;

  getSubmission(formId: string, submissionId: string): Promise<Submission | null>;
  listSubmissions(formId: string, opts?: ListOpts): Promise<Submission[]>;
  saveSubmission(formId: string, submission: Submission): Promise<void>;
}
```

Ships `InMemoryStorage`. Users plug in SQLite, Postgres, etc.

### API Routes

```
GET    /forms                       list all forms
POST   /forms                       create form
GET    /forms/:id                   get form schema
PUT    /forms/:id                   update form
DELETE /forms/:id                   delete form

GET    /forms/:id/describe          agent-readable description
GET    /forms/:id/tool-schema       tool definition (?format=claude|openai)

POST   /forms/:id/validate          dry-run validation
POST   /forms/:id/submit            validate + persist
GET    /forms/:id/submissions       list submissions
GET    /forms/:id/submissions/:sid  get submission
```

### Server Setup

```typescript
import { createFormaServer } from "@forma/server";
import { InMemoryStorage } from "@forma/server/storage";

const app = createFormaServer({ storage: new InMemoryStorage() });
export default app;
```

No auth built in — consumer adds their own middleware via Hono.

## Project Structure

```
forma-mono/
├── package.json                 # Bun workspace root
├── tsconfig.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schema.ts
│   │       ├── builder.ts
│   │       ├── validator.ts
│   │       ├── introspect.ts
│   │       ├── formats/
│   │       │   ├── registry.ts
│   │       │   ├── builtin.ts
│   │       │   └── ro.ts
│   │       └── generators/
│   │           ├── claude.ts
│   │           └── openai.ts
│   └── server/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── app.ts
│           ├── routes/
│           │   ├── forms.ts
│           │   └── submissions.ts
│           └── storage/
│               ├── interface.ts
│               └── memory.ts
├── tests/                        # per-package tests alongside src
└── examples/
    └── basic/
```

## Tooling

- **Runtime:** Bun
- **Workspaces:** Bun workspaces
- **Testing:** `bun test`
- **TypeScript:** strict mode, Bun runs TS natively (no build step for dev)

## What Makes This Agent-Native

| Aspect | Traditional (Human) | Forma (Agent) |
|--------|---------------------|---------------|
| Discovery | Visual preview | Schema introspection + `/describe` |
| Instructions | UI copy, placeholders | `instructions` field, `examples` per field |
| Validation | Inline UI errors | Structured errors with machine-readable codes |
| Conditional logic | Visual branching | Declarative rules in schema |
| Output | Webhook payloads | Typed, validated data objects |
| Integration | Embed iframe | Import as library or call API |
| Tool use | N/A | Auto-generated Claude/OpenAI tool schemas |

## Build Order

1. `@forma/core` — types, builder, validator, format registry, tool-schema generators, introspector
2. `@forma/server` — Hono routes, storage interface, InMemoryStorage
3. `@forma/agent-sdk` — deferred until server complexity justifies a dedicated client
