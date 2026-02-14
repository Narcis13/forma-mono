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
