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
