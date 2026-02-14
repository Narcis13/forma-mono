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
