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
      items: { type: "string", description: "Tags", enum: ["A", "B"] },
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
    expect(contact.properties!.name).toEqual({ type: "string", description: "Name" });
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
    expect(items.items!.type).toBe("object");
    expect(items.items!.properties!.name).toEqual({ type: "string", description: "Name" });
    expect(items.items!.required).toEqual(["name"]);
  });
});
