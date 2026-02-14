# Forma Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an agent-native form builder as a Bun monorepo with `@forma/core` (types, builder, validator, format registry, tool-schema generators, introspector) and `@forma/server` (Hono.js API, pluggable storage).

**Architecture:** Two packages in a Bun workspace. `@forma/core` is pure TypeScript with zero dependencies — it defines form schemas, validates data, and generates LLM tool definitions. `@forma/server` wraps core with Hono.js HTTP endpoints and a pluggable storage layer. Everything is TDD with `bun test`.

**Tech Stack:** Bun, TypeScript (strict), Hono.js, `bun test`

**Design doc:** `docs/plans/2026-02-15-forma-design.md`

---

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`

**Step 1: Create root workspace config**

`package.json`:
```json
{
  "name": "forma-mono",
  "private": true,
  "workspaces": ["packages/*"]
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun-types"]
  }
}
```

**Step 2: Create @forma/core package**

`packages/core/package.json`:
```json
{
  "name": "@forma/core",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./formats/ro": "./src/formats/ro.ts"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/core/src/index.ts`:
```typescript
// @forma/core - Agent-native form builder
export {};
```

**Step 3: Create @forma/server package**

`packages/server/package.json`:
```json
{
  "name": "@forma/server",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@forma/core": "workspace:*",
    "hono": "^4"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/server/src/index.ts`:
```typescript
// @forma/server - Hono.js API for Forma
export {};
```

**Step 4: Install dependencies**

Run: `bun install`

**Step 5: Verify workspace resolves**

Run: `bun run --filter '@forma/core' echo ok`
Expected: no errors

**Step 6: Commit**

```bash
git add package.json tsconfig.json packages/
git commit -m "scaffold: Bun monorepo with @forma/core and @forma/server"
```

---

### Task 2: Core Schema Types

**Files:**
- Create: `packages/core/src/schema.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/schema.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/schema.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import type {
  FormSchema,
  FieldDefinition,
  FieldType,
  ValidationRule,
  FieldOption,
  ConditionalRule,
  DependencyRule,
  ValidationResult,
  FieldError,
} from "@forma/core";

describe("Schema types", () => {
  test("FormSchema can be constructed with required fields", () => {
    const schema: FormSchema = {
      id: "test-form",
      version: 1,
      name: "Test Form",
      description: "A test form",
      fields: [],
    };
    expect(schema.id).toBe("test-form");
    expect(schema.version).toBe(1);
    expect(schema.fields).toEqual([]);
  });

  test("FormSchema accepts optional fields", () => {
    const schema: FormSchema = {
      id: "test",
      version: 1,
      name: "Test",
      description: "Test",
      fields: [],
      instructions: "Fill this out carefully",
      rules: [],
      metadata: { source: "api" },
    };
    expect(schema.instructions).toBe("Fill this out carefully");
    expect(schema.metadata).toEqual({ source: "api" });
  });

  test("FieldDefinition supports all field types", () => {
    const types: FieldType[] = [
      "text", "textarea", "number", "boolean",
      "select", "multi-select", "date", "datetime",
      "email", "phone", "url", "file-ref",
      "group", "array", "computed",
    ];
    for (const type of types) {
      const field: FieldDefinition = {
        id: `field-${type}`,
        type,
        label: type,
        required: false,
      };
      expect(field.type).toBe(type);
    }
  });

  test("FieldDefinition accepts agent-specific properties", () => {
    const field: FieldDefinition = {
      id: "cui",
      type: "text",
      label: "CUI",
      required: true,
      description: "Romanian company identifier",
      examples: ["RO12345678", "44556677"],
      format: "cui",
      validation: [{ type: "regex", pattern: "^RO?\\d{2,10}$" }],
    };
    expect(field.examples).toHaveLength(2);
    expect(field.format).toBe("cui");
  });

  test("FieldDefinition supports options for select types", () => {
    const field: FieldDefinition = {
      id: "company_type",
      type: "select",
      label: "Company Type",
      required: true,
      options: [
        { value: "srl", label: "SRL" },
        { value: "sa", label: "SA" },
      ],
    };
    expect(field.options).toHaveLength(2);
  });

  test("ValidationResult represents success", () => {
    const result: ValidationResult = {
      valid: true,
      data: { name: "Test" },
    };
    expect(result.valid).toBe(true);
  });

  test("ValidationResult represents failure with errors", () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        { field: "name", message: "Required field", code: "REQUIRED" },
      ],
    };
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("REQUIRED");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/schema.test.ts`
Expected: FAIL — types don't exist yet

**Step 3: Write the schema types**

`packages/core/src/schema.ts`:
```typescript
export type FieldType =
  | "text" | "textarea" | "number" | "boolean"
  | "select" | "multi-select" | "date" | "datetime"
  | "email" | "phone" | "url" | "file-ref"
  | "group" | "array" | "computed";

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface ValidationRule {
  type: "regex" | "min" | "max" | "minLength" | "maxLength" | "custom";
  pattern?: string;
  value?: number;
  message?: string;
}

export interface DependencyRule {
  field: string;
  condition: "equals" | "notEquals" | "exists" | "notExists";
  value?: unknown;
}

export interface ConditionalRule {
  when: { field: string; equals?: unknown; notEquals?: unknown; exists?: boolean };
  then: { show?: string; hide?: string; require?: string; unrequire?: string };
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: FieldOption[];
  default?: unknown;
  dependsOn?: DependencyRule;
  examples?: unknown[];
  format?: string;
  // group-specific
  fields?: FieldDefinition[];
  // array-specific
  minItems?: number;
  maxItems?: number;
  itemFields?: FieldDefinition[];
}

export interface FormSchema {
  id: string;
  version: number;
  name: string;
  description: string;
  instructions?: string;
  fields: FieldDefinition[];
  rules?: ConditionalRule[];
  metadata?: Record<string, unknown>;
}

export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export type ValidationResult =
  | { valid: true; data: Record<string, unknown> }
  | { valid: false; errors: FieldError[] };
```

Update `packages/core/src/index.ts`:
```typescript
export type {
  FieldType,
  FieldOption,
  ValidationRule,
  DependencyRule,
  ConditionalRule,
  FieldDefinition,
  FormSchema,
  FieldError,
  ValidationResult,
} from "./schema.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/schema.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add schema types — FormSchema, FieldDefinition, ValidationResult"
```

---

### Task 3: Format Registry

**Files:**
- Create: `packages/core/src/formats/registry.ts`
- Create: `packages/core/src/formats/builtin.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/formats.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/formats.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/formats.test.ts`
Expected: FAIL — FormatRegistry doesn't exist

**Step 3: Implement FormatRegistry and builtins**

`packages/core/src/formats/registry.ts`:
```typescript
export interface FormatDefinition {
  validate: (value: unknown) => boolean;
  description: string;
}

const formats = new Map<string, FormatDefinition>();

export const FormatRegistry = {
  register(name: string, definition: FormatDefinition): void {
    formats.set(name, definition);
  },

  registerAll(defs: Record<string, FormatDefinition>): void {
    for (const [name, def] of Object.entries(defs)) {
      formats.set(name, def);
    }
  },

  get(name: string): FormatDefinition | undefined {
    return formats.get(name);
  },

  has(name: string): boolean {
    return formats.has(name);
  },

  reset(): void {
    formats.clear();
  },

  loadBuiltins(): void {
    // Lazy import to avoid circular deps
    const { builtinFormats } = require("./builtin.js");
    FormatRegistry.registerAll(builtinFormats);
  },

  list(): string[] {
    return [...formats.keys()];
  },
};
```

`packages/core/src/formats/builtin.ts`:
```typescript
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
```

Update `packages/core/src/index.ts` to add:
```typescript
export { FormatRegistry } from "./formats/registry.js";
export type { FormatDefinition } from "./formats/registry.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/formats.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add FormatRegistry with builtin formats (email, url, uuid, date, datetime, phone)"
```

---

### Task 4: Romanian Format Pack

**Files:**
- Create: `packages/core/src/formats/ro.ts`
- Test: `packages/core/tests/formats-ro.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/formats-ro.test.ts`:
```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { FormatRegistry } from "@forma/core";
import { roFormats } from "@forma/core/formats/ro";

describe("Romanian formats", () => {
  beforeEach(() => {
    FormatRegistry.reset();
    FormatRegistry.registerAll(roFormats);
  });

  describe("CUI", () => {
    test("validates CUI with RO prefix", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("RO12345678")).toBe(true);
    });

    test("validates CUI without prefix", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("12345678")).toBe(true);
    });

    test("rejects invalid CUI", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("ABC")).toBe(false);
      expect(cui.validate("")).toBe(false);
      expect(cui.validate("RO")).toBe(false);
    });
  });

  describe("CNP", () => {
    test("validates 13-digit CNP", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("1900101123456")).toBe(true);
    });

    test("rejects invalid CNP length", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("123")).toBe(false);
      expect(cnp.validate("12345678901234")).toBe(false);
    });

    test("rejects non-numeric CNP", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("190010112345a")).toBe(false);
    });
  });

  describe("phone-ro", () => {
    test("validates Romanian mobile", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("0712345678")).toBe(true);
      expect(phone.validate("+40712345678")).toBe(true);
    });

    test("validates Romanian landline", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("0212345678")).toBe(true);
      expect(phone.validate("+40212345678")).toBe(true);
    });

    test("rejects invalid Romanian phone", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("123")).toBe(false);
      expect(phone.validate("+1555123456")).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/formats-ro.test.ts`
Expected: FAIL — ro.ts doesn't exist

**Step 3: Implement Romanian formats**

`packages/core/src/formats/ro.ts`:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/formats-ro.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add Romanian format pack (CUI, CNP, phone-ro)"
```

---

### Task 5: FormBuilder — Basic Fields

**Files:**
- Create: `packages/core/src/builder.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/builder.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/builder.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { FormBuilder } from "@forma/core";
import type { FormSchema } from "@forma/core";

describe("FormBuilder", () => {
  test("creates a minimal form", () => {
    const form = FormBuilder.create("test-form")
      .describe("A test form")
      .build();

    expect(form.id).toBe("test-form");
    expect(form.version).toBe(1);
    expect(form.name).toBe("test-form");
    expect(form.description).toBe("A test form");
    expect(form.fields).toEqual([]);
  });

  test("sets name and instructions", () => {
    const form = FormBuilder.create("f")
      .name("My Form")
      .describe("Desc")
      .instruct("Fill carefully")
      .build();

    expect(form.name).toBe("My Form");
    expect(form.instructions).toBe("Fill carefully");
  });

  test("adds text field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("company_name", { required: true, label: "Company Name" })
      .build();

    expect(form.fields).toHaveLength(1);
    expect(form.fields[0]).toEqual({
      id: "company_name",
      type: "text",
      label: "Company Name",
      required: true,
    });
  });

  test("adds number field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .number("age", { label: "Age", required: false })
      .build();

    expect(form.fields[0].type).toBe("number");
    expect(form.fields[0].id).toBe("age");
  });

  test("adds boolean field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .boolean("active", { label: "Active" })
      .build();

    expect(form.fields[0].type).toBe("boolean");
  });

  test("adds email field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .email("contact_email", { required: true, label: "Email" })
      .build();

    expect(form.fields[0].type).toBe("email");
    expect(form.fields[0].format).toBe("email");
  });

  test("adds textarea field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .textarea("notes", { label: "Notes" })
      .build();

    expect(form.fields[0].type).toBe("textarea");
  });

  test("adds date and datetime fields", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .date("start_date", { label: "Start" })
      .datetime("created_at", { label: "Created" })
      .build();

    expect(form.fields[0].type).toBe("date");
    expect(form.fields[0].format).toBe("date");
    expect(form.fields[1].type).toBe("datetime");
    expect(form.fields[1].format).toBe("datetime");
  });

  test("adds phone and url fields", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .phone("tel", { label: "Phone" })
      .url("website", { label: "Website" })
      .build();

    expect(form.fields[0].type).toBe("phone");
    expect(form.fields[0].format).toBe("phone");
    expect(form.fields[1].type).toBe("url");
    expect(form.fields[1].format).toBe("url");
  });

  test("adds select field with string options", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .select("company_type", {
        label: "Type",
        options: ["SRL", "SA", "PFA"],
      })
      .build();

    expect(form.fields[0].type).toBe("select");
    expect(form.fields[0].options).toEqual([
      { value: "SRL", label: "SRL" },
      { value: "SA", label: "SA" },
      { value: "PFA", label: "PFA" },
    ]);
  });

  test("adds select field with object options", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .select("status", {
        label: "Status",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      })
      .build();

    expect(form.fields[0].options).toEqual([
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ]);
  });

  test("adds multi-select field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .multiSelect("tags", {
        label: "Tags",
        options: ["A", "B", "C"],
      })
      .build();

    expect(form.fields[0].type).toBe("multi-select");
  });

  test("field accepts all optional properties", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("cui", {
        required: true,
        label: "CUI",
        description: "Romanian company ID",
        format: "cui",
        examples: ["RO12345678"],
        validation: [{ type: "regex", pattern: "^RO?\\d{2,10}$" }],
        default: "RO",
      })
      .build();

    const field = form.fields[0];
    expect(field.description).toBe("Romanian company ID");
    expect(field.format).toBe("cui");
    expect(field.examples).toEqual(["RO12345678"]);
    expect(field.validation).toHaveLength(1);
    expect(field.default).toBe("RO");
  });

  test("chains multiple fields", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("a", { label: "A" })
      .number("b", { label: "B" })
      .boolean("c", { label: "C" })
      .build();

    expect(form.fields).toHaveLength(3);
  });

  test("sets metadata", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .metadata({ source: "api", version: 2 })
      .build();

    expect(form.metadata).toEqual({ source: "api", version: 2 });
  });

  test("build returns a frozen schema", () => {
    const form = FormBuilder.create("f").describe("d").build();
    expect(() => { (form as any).id = "changed"; }).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/builder.test.ts`
Expected: FAIL — FormBuilder doesn't exist

**Step 3: Implement FormBuilder**

`packages/core/src/builder.ts`:
```typescript
import type {
  FormSchema,
  FieldDefinition,
  FieldOption,
  ValidationRule,
  ConditionalRule,
} from "./schema.js";

interface FieldOpts {
  required?: boolean;
  label: string;
  description?: string;
  format?: string;
  examples?: unknown[];
  validation?: ValidationRule[];
  default?: unknown;
  dependsOn?: FieldDefinition["dependsOn"];
}

interface SelectOpts extends FieldOpts {
  options: (string | FieldOption)[];
}

interface GroupOpts {
  describe?: string;
}

interface ArrayOpts extends FieldOpts {
  minItems?: number;
  maxItems?: number;
  fields: (builder: FormBuilder) => FormBuilder;
}

function normalizeOptions(options: (string | FieldOption)[]): FieldOption[] {
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
}

function buildField(id: string, type: FieldDefinition["type"], opts: FieldOpts): FieldDefinition {
  const field: FieldDefinition = {
    id,
    type,
    label: opts.label,
    required: opts.required ?? false,
  };
  if (opts.description !== undefined) field.description = opts.description;
  if (opts.format !== undefined) field.format = opts.format;
  if (opts.examples !== undefined) field.examples = opts.examples;
  if (opts.validation !== undefined) field.validation = opts.validation;
  if (opts.default !== undefined) field.default = opts.default;
  if (opts.dependsOn !== undefined) field.dependsOn = opts.dependsOn;
  return field;
}

export class FormBuilder {
  private _id: string;
  private _name: string;
  private _description = "";
  private _instructions?: string;
  private _fields: FieldDefinition[] = [];
  private _rules: ConditionalRule[] = [];
  private _metadata?: Record<string, unknown>;
  private _version = 1;

  private constructor(id: string) {
    this._id = id;
    this._name = id;
  }

  static create(id: string): FormBuilder {
    return new FormBuilder(id);
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  describe(description: string): this {
    this._description = description;
    return this;
  }

  instruct(instructions: string): this {
    this._instructions = instructions;
    return this;
  }

  version(v: number): this {
    this._version = v;
    return this;
  }

  metadata(meta: Record<string, unknown>): this {
    this._metadata = meta;
    return this;
  }

  // --- Scalar fields ---

  text(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "text", opts));
    return this;
  }

  textarea(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "textarea", opts));
    return this;
  }

  number(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "number", opts));
    return this;
  }

  boolean(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "boolean", opts));
    return this;
  }

  email(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "email", { ...opts, format: "email" }));
    return this;
  }

  phone(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "phone", { ...opts, format: "phone" }));
    return this;
  }

  url(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "url", { ...opts, format: "url" }));
    return this;
  }

  date(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "date", { ...opts, format: "date" }));
    return this;
  }

  datetime(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "datetime", { ...opts, format: "datetime" }));
    return this;
  }

  // --- Complex fields ---

  select(id: string, opts: SelectOpts): this {
    const field = buildField(id, "select", opts);
    field.options = normalizeOptions(opts.options);
    this._fields.push(field);
    return this;
  }

  multiSelect(id: string, opts: SelectOpts): this {
    const field = buildField(id, "multi-select", opts);
    field.options = normalizeOptions(opts.options);
    this._fields.push(field);
    return this;
  }

  group(id: string, build: (g: FormBuilder) => FormBuilder, opts?: GroupOpts): this {
    const sub = new FormBuilder(id);
    build(sub);
    const field: FieldDefinition = {
      id,
      type: "group",
      label: opts?.describe ?? id,
      required: false,
      fields: sub._fields,
    };
    if (opts?.describe) field.description = opts.describe;
    this._fields.push(field);
    return this;
  }

  array(id: string, opts: ArrayOpts): this {
    const sub = new FormBuilder(id);
    opts.fields(sub);
    const field = buildField(id, "array", opts);
    field.itemFields = sub._fields;
    if (opts.minItems !== undefined) field.minItems = opts.minItems;
    if (opts.maxItems !== undefined) field.maxItems = opts.maxItems;
    this._fields.push(field);
    return this;
  }

  // --- Rules ---

  rule(rule: ConditionalRule): this {
    this._rules.push(rule);
    return this;
  }

  // --- Build ---

  build(): Readonly<FormSchema> {
    const schema: FormSchema = {
      id: this._id,
      version: this._version,
      name: this._name,
      description: this._description,
      fields: this._fields,
    };
    if (this._instructions) schema.instructions = this._instructions;
    if (this._rules.length > 0) schema.rules = this._rules;
    if (this._metadata) schema.metadata = this._metadata;
    return Object.freeze(schema);
  }
}
```

Update `packages/core/src/index.ts` to add:
```typescript
export { FormBuilder } from "./builder.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/builder.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add FormBuilder fluent API with all field types, groups, arrays, and rules"
```

---

### Task 6: FormValidator

**Files:**
- Create: `packages/core/src/validator.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/validator.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/validator.test.ts`:
```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { FormBuilder, FormValidator, FormatRegistry } from "@forma/core";

describe("FormValidator", () => {
  beforeEach(() => {
    FormatRegistry.reset();
    FormatRegistry.loadBuiltins();
  });

  test("valid data returns success", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("name", { required: true, label: "Name" })
      .build();

    const result = FormValidator.validate(form, { name: "Alice" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe("Alice");
    }
  });

  test("missing required field returns error", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("name", { required: true, label: "Name" })
      .build();

    const result = FormValidator.validate(form, {});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("name");
      expect(result.errors[0].code).toBe("REQUIRED");
    }
  });

  test("optional field can be omitted", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("name", { required: false, label: "Name" })
      .build();

    const result = FormValidator.validate(form, {});
    expect(result.valid).toBe(true);
  });

  test("wrong type for number field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .number("age", { required: true, label: "Age" })
      .build();

    const result = FormValidator.validate(form, { age: "twenty" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  test("wrong type for boolean field", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .boolean("active", { required: true, label: "Active" })
      .build();

    const result = FormValidator.validate(form, { active: "yes" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    }
  });

  test("regex validation", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("code", {
        required: true,
        label: "Code",
        validation: [{ type: "regex", pattern: "^[A-Z]{3}$" }],
      })
      .build();

    expect(FormValidator.validate(form, { code: "ABC" }).valid).toBe(true);
    expect(FormValidator.validate(form, { code: "abc" }).valid).toBe(false);
    expect(FormValidator.validate(form, { code: "ABCD" }).valid).toBe(false);
  });

  test("minLength and maxLength validation", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("name", {
        required: true,
        label: "Name",
        validation: [
          { type: "minLength", value: 2 },
          { type: "maxLength", value: 50 },
        ],
      })
      .build();

    expect(FormValidator.validate(form, { name: "Al" }).valid).toBe(true);
    expect(FormValidator.validate(form, { name: "A" }).valid).toBe(false);
  });

  test("min and max validation for numbers", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .number("age", {
        required: true,
        label: "Age",
        validation: [
          { type: "min", value: 0 },
          { type: "max", value: 150 },
        ],
      })
      .build();

    expect(FormValidator.validate(form, { age: 25 }).valid).toBe(true);
    expect(FormValidator.validate(form, { age: -1 }).valid).toBe(false);
    expect(FormValidator.validate(form, { age: 200 }).valid).toBe(false);
  });

  test("format validation using FormatRegistry", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .email("email", { required: true, label: "Email" })
      .build();

    expect(FormValidator.validate(form, { email: "a@b.com" }).valid).toBe(true);
    expect(FormValidator.validate(form, { email: "not-email" }).valid).toBe(false);
  });

  test("select validates against options", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .select("type", { label: "Type", options: ["A", "B", "C"], required: true })
      .build();

    expect(FormValidator.validate(form, { type: "A" }).valid).toBe(true);
    expect(FormValidator.validate(form, { type: "D" }).valid).toBe(false);
  });

  test("multi-select validates each value against options", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .multiSelect("tags", { label: "Tags", options: ["X", "Y", "Z"], required: true })
      .build();

    expect(FormValidator.validate(form, { tags: ["X", "Y"] }).valid).toBe(true);
    expect(FormValidator.validate(form, { tags: ["X", "W"] }).valid).toBe(false);
    expect(FormValidator.validate(form, { tags: "X" }).valid).toBe(false); // must be array
  });

  test("group validation validates nested fields", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .group("contact", (g) =>
        g.text("name", { required: true, label: "Name" })
          .email("email", { required: true, label: "Email" })
      )
      .build();

    expect(FormValidator.validate(form, {
      contact: { name: "Alice", email: "a@b.com" },
    }).valid).toBe(true);

    const result = FormValidator.validate(form, {
      contact: { name: "Alice" },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe("contact.email");
    }
  });

  test("array validation validates each item", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .array("items", {
        label: "Items",
        required: true,
        minItems: 1,
        fields: (item) =>
          item.text("name", { required: true, label: "Name" }),
      })
      .build();

    expect(FormValidator.validate(form, {
      items: [{ name: "A" }, { name: "B" }],
    }).valid).toBe(true);

    // Empty array with minItems: 1
    const r1 = FormValidator.validate(form, { items: [] });
    expect(r1.valid).toBe(false);

    // Invalid item
    const r2 = FormValidator.validate(form, { items: [{}] });
    expect(r2.valid).toBe(false);
    if (!r2.valid) {
      expect(r2.errors[0].field).toBe("items[0].name");
    }
  });

  test("collects multiple errors", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("a", { required: true, label: "A" })
      .text("b", { required: true, label: "B" })
      .text("c", { required: true, label: "C" })
      .build();

    const result = FormValidator.validate(form, {});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(3);
    }
  });

  test("strips unknown fields from valid data", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("name", { required: true, label: "Name" })
      .build();

    const result = FormValidator.validate(form, { name: "Alice", extra: "junk" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual({ name: "Alice" });
      expect((result.data as any).extra).toBeUndefined();
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/validator.test.ts`
Expected: FAIL — FormValidator doesn't exist

**Step 3: Implement FormValidator**

`packages/core/src/validator.ts`:
```typescript
import type {
  FormSchema,
  FieldDefinition,
  FieldError,
  ValidationResult,
  ValidationRule,
} from "./schema.js";
import { FormatRegistry } from "./formats/registry.js";

function validateField(
  field: FieldDefinition,
  value: unknown,
  path: string,
  errors: FieldError[],
  cleanData: Record<string, unknown>,
): void {
  // Required check
  if (value === undefined || value === null || value === "") {
    if (field.required) {
      errors.push({ field: path, message: `${field.label} is required`, code: "REQUIRED" });
    }
    return;
  }

  // Type checks
  switch (field.type) {
    case "number": {
      if (typeof value !== "number") {
        errors.push({ field: path, message: `${field.label} must be a number`, code: "INVALID_TYPE" });
        return;
      }
      break;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        errors.push({ field: path, message: `${field.label} must be a boolean`, code: "INVALID_TYPE" });
        return;
      }
      break;
    }
    case "select": {
      if (typeof value !== "string") {
        errors.push({ field: path, message: `${field.label} must be a string`, code: "INVALID_TYPE" });
        return;
      }
      if (field.options && !field.options.some((o) => o.value === value)) {
        errors.push({
          field: path,
          message: `${field.label} must be one of: ${field.options.map((o) => o.value).join(", ")}`,
          code: "INVALID_OPTION",
        });
        return;
      }
      break;
    }
    case "multi-select": {
      if (!Array.isArray(value)) {
        errors.push({ field: path, message: `${field.label} must be an array`, code: "INVALID_TYPE" });
        return;
      }
      const validValues = field.options?.map((o) => o.value) ?? [];
      for (const item of value) {
        if (!validValues.includes(item)) {
          errors.push({
            field: path,
            message: `${field.label} contains invalid option: ${item}`,
            code: "INVALID_OPTION",
          });
          return;
        }
      }
      break;
    }
    case "group": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ field: path, message: `${field.label} must be an object`, code: "INVALID_TYPE" });
        return;
      }
      const groupData: Record<string, unknown> = {};
      for (const subField of field.fields ?? []) {
        validateField(subField, (value as Record<string, unknown>)[subField.id], `${path}.${subField.id}`, errors, groupData);
      }
      cleanData[field.id] = groupData;
      return; // Skip the cleanData assignment below
    }
    case "array": {
      if (!Array.isArray(value)) {
        errors.push({ field: path, message: `${field.label} must be an array`, code: "INVALID_TYPE" });
        return;
      }
      if (field.minItems !== undefined && value.length < field.minItems) {
        errors.push({
          field: path,
          message: `${field.label} must have at least ${field.minItems} item(s)`,
          code: "MIN_ITEMS",
        });
        return;
      }
      if (field.maxItems !== undefined && value.length > field.maxItems) {
        errors.push({
          field: path,
          message: `${field.label} must have at most ${field.maxItems} item(s)`,
          code: "MAX_ITEMS",
        });
        return;
      }
      const arrayData: Record<string, unknown>[] = [];
      for (let i = 0; i < value.length; i++) {
        const itemData: Record<string, unknown> = {};
        const item = value[i];
        for (const itemField of field.itemFields ?? []) {
          validateField(
            itemField,
            typeof item === "object" && item !== null ? (item as Record<string, unknown>)[itemField.id] : undefined,
            `${path}[${i}].${itemField.id}`,
            errors,
            itemData,
          );
        }
        arrayData.push(itemData);
      }
      cleanData[field.id] = arrayData;
      return;
    }
    default: {
      // Text-like fields: text, textarea, email, phone, url, date, datetime, file-ref
      if (typeof value !== "string") {
        errors.push({ field: path, message: `${field.label} must be a string`, code: "INVALID_TYPE" });
        return;
      }
    }
  }

  // Format validation
  if (field.format) {
    const fmt = FormatRegistry.get(field.format);
    if (fmt && !fmt.validate(value)) {
      errors.push({
        field: path,
        message: `${field.label} does not match format "${field.format}"`,
        code: "INVALID_FORMAT",
      });
      return;
    }
  }

  // Validation rules
  if (field.validation) {
    for (const rule of field.validation) {
      if (!applyRule(rule, value)) {
        errors.push({
          field: path,
          message: rule.message ?? `${field.label} failed validation: ${rule.type}`,
          code: `VALIDATION_${rule.type.toUpperCase()}`,
        });
        return;
      }
    }
  }

  cleanData[field.id] = value;
}

function applyRule(rule: ValidationRule, value: unknown): boolean {
  switch (rule.type) {
    case "regex":
      return typeof value === "string" && new RegExp(rule.pattern!).test(value);
    case "min":
      return typeof value === "number" && value >= rule.value!;
    case "max":
      return typeof value === "number" && value <= rule.value!;
    case "minLength":
      return typeof value === "string" && value.length >= rule.value!;
    case "maxLength":
      return typeof value === "string" && value.length <= rule.value!;
    default:
      return true;
  }
}

export const FormValidator = {
  validate(schema: Readonly<FormSchema>, data: Record<string, unknown>): ValidationResult {
    const errors: FieldError[] = [];
    const cleanData: Record<string, unknown> = {};

    for (const field of schema.fields) {
      validateField(field, data[field.id], field.id, errors, cleanData);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }
    return { valid: true, data: cleanData };
  },
};
```

Update `packages/core/src/index.ts` to add:
```typescript
export { FormValidator } from "./validator.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/validator.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add FormValidator with type checking, format validation, groups, and arrays"
```

---

### Task 7: FormIntrospector

**Files:**
- Create: `packages/core/src/introspect.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/introspect.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/introspect.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { FormBuilder, FormIntrospector } from "@forma/core";

describe("FormIntrospector", () => {
  const form = FormBuilder.create("onboarding")
    .name("Client Onboarding")
    .describe("Collect new client info")
    .instruct("Ask for CUI first")
    .text("company_name", { required: true, label: "Company Name" })
    .text("cui", {
      required: true,
      label: "CUI",
      description: "Romanian company ID",
      format: "cui",
      examples: ["RO12345678", "44556677"],
    })
    .text("notes", { required: false, label: "Notes" })
    .build();

  test("returns purpose from description", () => {
    const desc = FormIntrospector.describe(form);
    expect(desc.purpose).toBe("Collect new client info");
  });

  test("returns instructions", () => {
    const desc = FormIntrospector.describe(form);
    expect(desc.instructions).toBe("Ask for CUI first");
  });

  test("separates required and optional fields", () => {
    const desc = FormIntrospector.describe(form);
    expect(desc.requiredFields).toEqual(["company_name", "cui"]);
    expect(desc.optionalFields).toEqual(["notes"]);
  });

  test("includes field details", () => {
    const desc = FormIntrospector.describe(form);
    expect(desc.fieldDetails.cui).toEqual({
      type: "text",
      label: "CUI",
      description: "Romanian company ID",
      format: "cui",
      examples: ["RO12345678", "44556677"],
      required: true,
    });
  });

  test("field details omit undefined properties", () => {
    const desc = FormIntrospector.describe(form);
    expect(desc.fieldDetails.company_name).toEqual({
      type: "text",
      label: "Company Name",
      required: true,
    });
    // No description, format, or examples keys
    expect("description" in desc.fieldDetails.company_name).toBe(false);
    expect("format" in desc.fieldDetails.company_name).toBe(false);
  });

  test("form without instructions omits it", () => {
    const simpleForm = FormBuilder.create("f").describe("d").build();
    const desc = FormIntrospector.describe(simpleForm);
    expect(desc.instructions).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/introspect.test.ts`
Expected: FAIL

**Step 3: Implement FormIntrospector**

`packages/core/src/introspect.ts`:
```typescript
import type { FormSchema, FieldDefinition } from "./schema.js";

interface FieldDetail {
  type: string;
  label: string;
  required: boolean;
  description?: string;
  format?: string;
  examples?: unknown[];
  options?: string[];
}

export interface FormDescription {
  purpose: string;
  instructions?: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldDetails: Record<string, FieldDetail>;
}

function describeField(field: FieldDefinition): FieldDetail {
  const detail: FieldDetail = {
    type: field.type,
    label: field.label,
    required: field.required,
  };
  if (field.description !== undefined) detail.description = field.description;
  if (field.format !== undefined) detail.format = field.format;
  if (field.examples !== undefined) detail.examples = field.examples;
  if (field.options !== undefined) detail.options = field.options.map((o) => o.label);
  return detail;
}

export const FormIntrospector = {
  describe(schema: Readonly<FormSchema>): FormDescription {
    const requiredFields: string[] = [];
    const optionalFields: string[] = [];
    const fieldDetails: Record<string, FieldDetail> = {};

    for (const field of schema.fields) {
      if (field.required) {
        requiredFields.push(field.id);
      } else {
        optionalFields.push(field.id);
      }
      fieldDetails[field.id] = describeField(field);
    }

    const desc: FormDescription = {
      purpose: schema.description,
      requiredFields,
      optionalFields,
      fieldDetails,
    };
    if (schema.instructions) desc.instructions = schema.instructions;
    return desc;
  },
};
```

Update `packages/core/src/index.ts` to add:
```typescript
export { FormIntrospector } from "./introspect.js";
export type { FormDescription } from "./introspect.js";
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/introspect.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add FormIntrospector for agent-readable schema descriptions"
```

---

### Task 8: Tool Schema Generator — Claude

**Files:**
- Create: `packages/core/src/generators/claude.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/generators-claude.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/generators-claude.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { FormBuilder, ToolSchemaGenerator } from "@forma/core";

describe("ToolSchemaGenerator.claude", () => {
  test("generates basic tool definition", () => {
    const form = FormBuilder.create("signup")
      .describe("User signup form")
      .text("name", { required: true, label: "Full Name" })
      .email("email", { required: true, label: "Email" })
      .build();

    const tool = ToolSchemaGenerator.claude(form);

    expect(tool.name).toBe("submit_signup");
    expect(tool.description).toBe("User signup form");
    expect(tool.input_schema.type).toBe("object");
    expect(tool.input_schema.required).toEqual(["name", "email"]);
    expect(tool.input_schema.properties.name).toEqual({
      type: "string",
      description: "Full Name",
    });
    expect(tool.input_schema.properties.email).toEqual({
      type: "string",
      description: "Email",
      format: "email",
    });
  });

  test("includes instructions in description", () => {
    const form = FormBuilder.create("f")
      .describe("Base description")
      .instruct("Ask for name first")
      .text("name", { label: "Name" })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.description).toContain("Base description");
    expect(tool.description).toContain("Ask for name first");
  });

  test("maps number type", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .number("age", { label: "Age", required: true })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.age).toEqual({
      type: "number",
      description: "Age",
    });
  });

  test("maps boolean type", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .boolean("active", { label: "Is Active" })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.active).toEqual({
      type: "boolean",
      description: "Is Active",
    });
  });

  test("maps select to enum", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .select("type", {
        label: "Company Type",
        required: true,
        options: ["SRL", "SA", "PFA"],
      })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.type).toEqual({
      type: "string",
      description: "Company Type",
      enum: ["SRL", "SA", "PFA"],
    });
  });

  test("maps multi-select to array of enum", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .multiSelect("tags", {
        label: "Tags",
        options: ["A", "B"],
      })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.tags).toEqual({
      type: "array",
      description: "Tags",
      items: { type: "string", enum: ["A", "B"] },
    });
  });

  test("includes examples in description", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("cui", {
        label: "CUI",
        required: true,
        description: "Company ID",
        examples: ["RO12345678", "44556677"],
      })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.cui.description).toContain("RO12345678");
    expect(tool.input_schema.properties.cui.description).toContain("44556677");
  });

  test("includes regex pattern", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .text("code", {
        label: "Code",
        validation: [{ type: "regex", pattern: "^[A-Z]{3}$" }],
      })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    expect(tool.input_schema.properties.code.pattern).toBe("^[A-Z]{3}$");
  });

  test("maps group to nested object", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .group("contact", (g) =>
        g.text("name", { required: true, label: "Name" })
          .email("email", { required: true, label: "Email" })
      )
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    const contact = tool.input_schema.properties.contact;
    expect(contact.type).toBe("object");
    expect(contact.properties.name).toEqual({ type: "string", description: "Name" });
    expect(contact.required).toEqual(["name", "email"]);
  });

  test("maps array to array of objects", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .array("items", {
        label: "Items",
        minItems: 1,
        fields: (item) =>
          item.text("name", { required: true, label: "Name" })
            .number("qty", { label: "Quantity" }),
      })
      .build();

    const tool = ToolSchemaGenerator.claude(form);
    const items = tool.input_schema.properties.items;
    expect(items.type).toBe("array");
    expect(items.minItems).toBe(1);
    expect(items.items.type).toBe("object");
    expect(items.items.properties.name).toEqual({ type: "string", description: "Name" });
    expect(items.items.required).toEqual(["name"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/generators-claude.test.ts`
Expected: FAIL

**Step 3: Implement Claude generator**

`packages/core/src/generators/claude.ts`:
```typescript
import type { FormSchema, FieldDefinition } from "../schema.js";

interface JsonSchemaProperty {
  type: string;
  description: string;
  format?: string;
  enum?: string[];
  pattern?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minItems?: number;
  maxItems?: number;
}

export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, JsonSchemaProperty>;
    required: string[];
  };
}

function fieldToJsonSchema(field: FieldDefinition): JsonSchemaProperty {
  let description = field.description ?? field.label;
  if (field.examples && field.examples.length > 0) {
    description += `. Examples: ${field.examples.join(", ")}`;
  }

  switch (field.type) {
    case "number": {
      const prop: JsonSchemaProperty = { type: "number", description };
      addValidationConstraints(field, prop);
      return prop;
    }
    case "boolean":
      return { type: "boolean", description };
    case "select": {
      const prop: JsonSchemaProperty = {
        type: "string",
        description,
        enum: field.options?.map((o) => o.value),
      };
      return prop;
    }
    case "multi-select":
      return {
        type: "array",
        description,
        items: {
          type: "string",
          description: field.label,
          enum: field.options?.map((o) => o.value),
        },
      };
    case "group": {
      const properties: Record<string, JsonSchemaProperty> = {};
      const required: string[] = [];
      for (const sub of field.fields ?? []) {
        properties[sub.id] = fieldToJsonSchema(sub);
        if (sub.required) required.push(sub.id);
      }
      const prop: JsonSchemaProperty = { type: "object", description, properties };
      if (required.length > 0) prop.required = required;
      return prop;
    }
    case "array": {
      const itemProps: Record<string, JsonSchemaProperty> = {};
      const itemRequired: string[] = [];
      for (const sub of field.itemFields ?? []) {
        itemProps[sub.id] = fieldToJsonSchema(sub);
        if (sub.required) itemRequired.push(sub.id);
      }
      const items: JsonSchemaProperty = { type: "object", description: field.label, properties: itemProps };
      if (itemRequired.length > 0) items.required = itemRequired;
      const prop: JsonSchemaProperty = { type: "array", description, items };
      if (field.minItems !== undefined) prop.minItems = field.minItems;
      if (field.maxItems !== undefined) prop.maxItems = field.maxItems;
      return prop;
    }
    default: {
      // All text-like fields: text, textarea, email, phone, url, date, datetime, file-ref
      const prop: JsonSchemaProperty = { type: "string", description };
      if (field.format) prop.format = field.format;
      addValidationConstraints(field, prop);
      return prop;
    }
  }
}

function addValidationConstraints(field: FieldDefinition, prop: JsonSchemaProperty): void {
  if (!field.validation) return;
  for (const rule of field.validation) {
    if (rule.type === "regex" && rule.pattern) {
      prop.pattern = rule.pattern;
    }
  }
}

export function generateClaudeToolSchema(schema: Readonly<FormSchema>): ClaudeToolDefinition {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const field of schema.fields) {
    properties[field.id] = fieldToJsonSchema(field);
    if (field.required) required.push(field.id);
  }

  let description = schema.description;
  if (schema.instructions) {
    description += ` ${schema.instructions}`;
  }

  return {
    name: `submit_${schema.id}`,
    description,
    input_schema: {
      type: "object",
      properties,
      required,
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/generators-claude.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add Claude tool_use schema generator"
```

---

### Task 9: Tool Schema Generator — OpenAI

**Files:**
- Create: `packages/core/src/generators/openai.ts`
- Modify: `packages/core/src/index.ts` (add ToolSchemaGenerator export)
- Test: `packages/core/tests/generators-openai.test.ts`

**Step 1: Write the failing test**

`packages/core/tests/generators-openai.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { FormBuilder, ToolSchemaGenerator } from "@forma/core";

describe("ToolSchemaGenerator.openai", () => {
  test("generates OpenAI function definition", () => {
    const form = FormBuilder.create("signup")
      .describe("User signup form")
      .text("name", { required: true, label: "Full Name" })
      .email("email", { required: true, label: "Email" })
      .build();

    const fn = ToolSchemaGenerator.openai(form);

    expect(fn.type).toBe("function");
    expect(fn.function.name).toBe("submit_signup");
    expect(fn.function.description).toBe("User signup form");
    expect(fn.function.parameters.type).toBe("object");
    expect(fn.function.parameters.required).toEqual(["name", "email"]);
    expect(fn.function.parameters.properties.name).toEqual({
      type: "string",
      description: "Full Name",
    });
  });

  test("maps select to enum", () => {
    const form = FormBuilder.create("f")
      .describe("d")
      .select("type", { label: "Type", options: ["A", "B"], required: true })
      .build();

    const fn = ToolSchemaGenerator.openai(form);
    expect(fn.function.parameters.properties.type.enum).toEqual(["A", "B"]);
  });

  test("includes instructions in description", () => {
    const form = FormBuilder.create("f")
      .describe("Desc")
      .instruct("Do this first")
      .text("x", { label: "X" })
      .build();

    const fn = ToolSchemaGenerator.openai(form);
    expect(fn.function.description).toContain("Desc");
    expect(fn.function.description).toContain("Do this first");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && bun test tests/generators-openai.test.ts`
Expected: FAIL

**Step 3: Implement OpenAI generator and ToolSchemaGenerator facade**

`packages/core/src/generators/openai.ts`:
```typescript
import type { FormSchema } from "../schema.js";
import { generateClaudeToolSchema } from "./claude.js";

export interface OpenAIFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export function generateOpenAIToolSchema(schema: Readonly<FormSchema>): OpenAIFunctionDefinition {
  // OpenAI format wraps the same JSON Schema in a different envelope
  const claude = generateClaudeToolSchema(schema);

  return {
    type: "function",
    function: {
      name: claude.name,
      description: claude.description,
      parameters: claude.input_schema,
    },
  };
}
```

Now create the unified `ToolSchemaGenerator` and update `packages/core/src/index.ts` to export everything:

```typescript
// packages/core/src/index.ts
export type {
  FieldType,
  FieldOption,
  ValidationRule,
  DependencyRule,
  ConditionalRule,
  FieldDefinition,
  FormSchema,
  FieldError,
  ValidationResult,
} from "./schema.js";

export { FormBuilder } from "./builder.js";
export { FormValidator } from "./validator.js";
export { FormIntrospector } from "./introspect.js";
export type { FormDescription } from "./introspect.js";
export { FormatRegistry } from "./formats/registry.js";
export type { FormatDefinition } from "./formats/registry.js";

import { generateClaudeToolSchema } from "./generators/claude.js";
import { generateOpenAIToolSchema } from "./generators/openai.js";
export type { ClaudeToolDefinition } from "./generators/claude.js";
export type { OpenAIFunctionDefinition } from "./generators/openai.js";

export const ToolSchemaGenerator = {
  claude: generateClaudeToolSchema,
  openai: generateOpenAIToolSchema,
};
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && bun test tests/generators-openai.test.ts`
Expected: ALL PASS

**Step 5: Run ALL core tests**

Run: `cd packages/core && bun test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add OpenAI function calling generator and ToolSchemaGenerator facade"
```

---

### Task 10: Server — Storage Interface + InMemoryStorage

**Files:**
- Create: `packages/server/src/storage/interface.ts`
- Create: `packages/server/src/storage/memory.ts`
- Test: `packages/server/tests/storage.test.ts`

**Step 1: Write the failing test**

`packages/server/tests/storage.test.ts`:
```typescript
import { describe, expect, test, beforeEach } from "bun:test";
import { InMemoryStorage } from "../src/storage/memory.js";
import { FormBuilder } from "@forma/core";
import type { Submission } from "../src/storage/interface.js";

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  const form = FormBuilder.create("test-form")
    .describe("Test")
    .text("name", { required: true, label: "Name" })
    .build();

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  // --- Forms ---

  test("saveForm and getForm", async () => {
    await storage.saveForm(form);
    const retrieved = await storage.getForm("test-form");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("test-form");
  });

  test("getForm returns null for missing form", async () => {
    const result = await storage.getForm("nonexistent");
    expect(result).toBeNull();
  });

  test("listForms returns all forms", async () => {
    await storage.saveForm(form);
    const form2 = FormBuilder.create("form-2").describe("d").build();
    await storage.saveForm(form2);
    const list = await storage.listForms();
    expect(list).toHaveLength(2);
  });

  test("saveForm overwrites existing form", async () => {
    await storage.saveForm(form);
    const updated = { ...form, description: "Updated" } as any;
    await storage.saveForm(updated);
    const retrieved = await storage.getForm("test-form");
    expect(retrieved!.description).toBe("Updated");
  });

  test("deleteForm removes form", async () => {
    await storage.saveForm(form);
    await storage.deleteForm("test-form");
    const result = await storage.getForm("test-form");
    expect(result).toBeNull();
  });

  // --- Submissions ---

  test("saveSubmission and getSubmission", async () => {
    await storage.saveForm(form);
    const sub: Submission = {
      id: "sub-1",
      formId: "test-form",
      data: { name: "Alice" },
      createdAt: new Date().toISOString(),
    };
    await storage.saveSubmission("test-form", sub);
    const retrieved = await storage.getSubmission("test-form", "sub-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.data.name).toBe("Alice");
  });

  test("listSubmissions returns submissions for a form", async () => {
    await storage.saveForm(form);
    const sub1: Submission = { id: "s1", formId: "test-form", data: { name: "A" }, createdAt: new Date().toISOString() };
    const sub2: Submission = { id: "s2", formId: "test-form", data: { name: "B" }, createdAt: new Date().toISOString() };
    await storage.saveSubmission("test-form", sub1);
    await storage.saveSubmission("test-form", sub2);
    const list = await storage.listSubmissions("test-form");
    expect(list).toHaveLength(2);
  });

  test("getSubmission returns null for missing submission", async () => {
    const result = await storage.getSubmission("test-form", "nonexistent");
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && bun test tests/storage.test.ts`
Expected: FAIL

**Step 3: Implement StorageAdapter and InMemoryStorage**

`packages/server/src/storage/interface.ts`:
```typescript
import type { FormSchema } from "@forma/core";

export interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface ListOpts {
  limit?: number;
  offset?: number;
}

export interface StorageAdapter {
  getForm(id: string): Promise<FormSchema | null>;
  listForms(): Promise<FormSchema[]>;
  saveForm(schema: FormSchema): Promise<void>;
  deleteForm(id: string): Promise<void>;

  getSubmission(formId: string, submissionId: string): Promise<Submission | null>;
  listSubmissions(formId: string, opts?: ListOpts): Promise<Submission[]>;
  saveSubmission(formId: string, submission: Submission): Promise<void>;
}
```

`packages/server/src/storage/memory.ts`:
```typescript
import type { FormSchema } from "@forma/core";
import type { StorageAdapter, Submission, ListOpts } from "./interface.js";

export class InMemoryStorage implements StorageAdapter {
  private forms = new Map<string, FormSchema>();
  private submissions = new Map<string, Submission[]>();

  async getForm(id: string): Promise<FormSchema | null> {
    return this.forms.get(id) ?? null;
  }

  async listForms(): Promise<FormSchema[]> {
    return [...this.forms.values()];
  }

  async saveForm(schema: FormSchema): Promise<void> {
    this.forms.set(schema.id, schema);
  }

  async deleteForm(id: string): Promise<void> {
    this.forms.delete(id);
    this.submissions.delete(id);
  }

  async getSubmission(formId: string, submissionId: string): Promise<Submission | null> {
    const subs = this.submissions.get(formId) ?? [];
    return subs.find((s) => s.id === submissionId) ?? null;
  }

  async listSubmissions(formId: string, opts?: ListOpts): Promise<Submission[]> {
    const subs = this.submissions.get(formId) ?? [];
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? subs.length;
    return subs.slice(offset, offset + limit);
  }

  async saveSubmission(formId: string, submission: Submission): Promise<void> {
    if (!this.submissions.has(formId)) {
      this.submissions.set(formId, []);
    }
    this.submissions.get(formId)!.push(submission);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/server && bun test tests/storage.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/server/
git commit -m "feat(server): add StorageAdapter interface and InMemoryStorage implementation"
```

---

### Task 11: Server — Hono App + Form CRUD Routes

**Files:**
- Create: `packages/server/src/app.ts`
- Create: `packages/server/src/routes/forms.ts`
- Modify: `packages/server/src/index.ts`
- Test: `packages/server/tests/forms.test.ts`

**Step 1: Install Hono**

Run: `cd packages/server && bun add hono`

**Step 2: Write the failing test**

`packages/server/tests/forms.test.ts`:
```typescript
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
```

**Step 3: Run test to verify it fails**

Run: `cd packages/server && bun test tests/forms.test.ts`
Expected: FAIL

**Step 4: Implement routes**

`packages/server/src/routes/forms.ts`:
```typescript
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
```

`packages/server/src/app.ts`:
```typescript
import { Hono } from "hono";
import type { StorageAdapter } from "./storage/interface.js";
import { formsRoutes } from "./routes/forms.js";

export interface FormaServerOptions {
  storage: StorageAdapter;
}

export function createFormaServer(opts: FormaServerOptions) {
  const app = new Hono();
  app.route("/forms", formsRoutes(opts.storage));
  return app;
}
```

Update `packages/server/src/index.ts`:
```typescript
export { createFormaServer } from "./app.js";
export type { FormaServerOptions } from "./app.js";
export type { StorageAdapter, Submission, ListOpts } from "./storage/interface.js";
export { InMemoryStorage } from "./storage/memory.js";
```

**Step 5: Run test to verify it passes**

Run: `cd packages/server && bun test tests/forms.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/server/
git commit -m "feat(server): add Hono app with form CRUD, describe, and tool-schema routes"
```

---

### Task 12: Server — Submission Routes

**Files:**
- Create: `packages/server/src/routes/submissions.ts`
- Modify: `packages/server/src/routes/forms.ts` (mount submissions sub-routes)
- Test: `packages/server/tests/submissions.test.ts`

**Step 1: Write the failing test**

`packages/server/tests/submissions.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && bun test tests/submissions.test.ts`
Expected: FAIL

**Step 3: Implement submission routes**

`packages/server/src/routes/submissions.ts`:
```typescript
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
```

Update `packages/server/src/app.ts` to mount submission routes:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd packages/server && bun test tests/submissions.test.ts`
Expected: ALL PASS

**Step 5: Run ALL server tests**

Run: `cd packages/server && bun test`
Expected: ALL PASS

**Step 6: Run ALL tests across the entire monorepo**

Run: `bun test --recursive`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add packages/server/
git commit -m "feat(server): add submission routes — validate, submit, list, get"
```

---

### Task 13: Integration Smoke Test

**Files:**
- Create: `examples/basic/index.ts`
- Test: manual run

**Step 1: Write example**

`examples/basic/index.ts`:
```typescript
import { FormBuilder, FormValidator, FormIntrospector, ToolSchemaGenerator, FormatRegistry } from "@forma/core";
import { roFormats } from "@forma/core/formats/ro";

// Register Romanian formats
FormatRegistry.loadBuiltins();
FormatRegistry.registerAll(roFormats);

// Build a form
const form = FormBuilder.create("client-onboarding")
  .name("Client Onboarding")
  .describe("Collect new client information for accounting setup")
  .instruct("Ask for CUI first, then auto-fill company details if possible")
  .text("company_name", { required: true, label: "Company Name" })
  .text("cui", {
    required: true,
    label: "CUI",
    description: "Romanian company identifier",
    format: "cui",
    validation: [{ type: "regex", pattern: "^RO?\\d{2,10}$" }],
    examples: ["RO12345678", "44556677"],
  })
  .select("company_type", {
    label: "Company Type",
    required: true,
    options: ["SRL", "SA", "PFA", "SNC", "II"],
  })
  .group("contact", (g) =>
    g.text("name", { required: true, label: "Contact Name" })
      .email("email", { required: true, label: "Contact Email" })
      .phone("phone", { label: "Phone" })
  )
  .array("associates", {
    label: "Associates",
    required: true,
    minItems: 1,
    fields: (item) =>
      item.text("name", { required: true, label: "Name" })
        .text("cnp", { label: "CNP", format: "cnp" })
        .number("share_pct", { label: "Share %" }),
  })
  .build();

// Introspect
console.log("=== Form Description ===");
console.log(JSON.stringify(FormIntrospector.describe(form), null, 2));

// Generate tool schemas
console.log("\n=== Claude Tool Schema ===");
console.log(JSON.stringify(ToolSchemaGenerator.claude(form), null, 2));

console.log("\n=== OpenAI Tool Schema ===");
console.log(JSON.stringify(ToolSchemaGenerator.openai(form), null, 2));

// Validate good data
const goodData = {
  company_name: "Example SRL",
  cui: "RO12345678",
  company_type: "SRL",
  contact: { name: "Ion Popescu", email: "ion@example.com", phone: "+40712345678" },
  associates: [{ name: "Ion Popescu", cnp: "1900101123456", share_pct: 100 }],
};

console.log("\n=== Validation (valid) ===");
console.log(JSON.stringify(FormValidator.validate(form, goodData), null, 2));

// Validate bad data
const badData = {
  company_name: "",
  cui: "INVALID",
  company_type: "GmbH",
};

console.log("\n=== Validation (invalid) ===");
console.log(JSON.stringify(FormValidator.validate(form, badData), null, 2));
```

**Step 2: Run the example**

Run: `bun examples/basic/index.ts`
Expected: Prints form description, both tool schemas, valid result, and errors for invalid data

**Step 3: Commit**

```bash
git add examples/
git commit -m "docs: add basic example demonstrating core API usage"
```

---

## Summary

| Task | What | Package |
|------|------|---------|
| 1 | Monorepo scaffold | root |
| 2 | Schema types | core |
| 3 | FormatRegistry + builtins | core |
| 4 | Romanian format pack | core |
| 5 | FormBuilder fluent API | core |
| 6 | FormValidator | core |
| 7 | FormIntrospector | core |
| 8 | Claude tool schema generator | core |
| 9 | OpenAI tool schema generator | core |
| 10 | StorageAdapter + InMemoryStorage | server |
| 11 | Hono app + form CRUD routes | server |
| 12 | Submission routes | server |
| 13 | Integration smoke test | examples |
