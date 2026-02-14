export type FieldType =
  | "text" | "textarea" | "number" | "boolean"
  | "select" | "multi-select" | "date" | "datetime"
  | "email" | "phone" | "url" | "file-ref"
  | "group" | "array" | "computed";

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface ValidationRule {
  type: "regex" | "min" | "max" | "minLength" | "maxLength" | "custom";
  pattern?: string;
  value?: number;
  message?: string;
}

export interface DependencyRule {
  field: string;
  condition: "equals" | "notEquals" | "exists" | "notExists";
  value?: unknown;
}

export interface ConditionalRule {
  when: { field: string; equals?: unknown; notEquals?: unknown; exists?: boolean };
  then: { show?: string; hide?: string; require?: string; unrequire?: string };
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: FieldOption[];
  default?: unknown;
  dependsOn?: DependencyRule;
  examples?: unknown[];
  format?: string;
  // group-specific
  fields?: FieldDefinition[];
  // array-specific
  minItems?: number;
  maxItems?: number;
  itemFields?: FieldDefinition[];
}

export interface FormSchema {
  id: string;
  version: number;
  name: string;
  description: string;
  instructions?: string;
  fields: FieldDefinition[];
  rules?: ConditionalRule[];
  metadata?: Record<string, unknown>;
}

export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export type ValidationResult =
  | { valid: true; data: Record<string, unknown> }
  | { valid: false; errors: FieldError[] };
