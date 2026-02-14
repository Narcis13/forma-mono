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
