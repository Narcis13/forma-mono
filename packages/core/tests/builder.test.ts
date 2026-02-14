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
