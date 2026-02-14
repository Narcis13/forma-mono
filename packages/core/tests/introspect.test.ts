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
