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
