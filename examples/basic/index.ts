import { FormBuilder, FormValidator, FormIntrospector, ToolSchemaGenerator, FormatRegistry } from "../../packages/core/src/index.js";
import { roFormats } from "../../packages/core/src/formats/ro.js";

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
