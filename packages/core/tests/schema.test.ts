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
