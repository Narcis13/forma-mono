import type {
  FormSchema,
  FieldDefinition,
  FieldOption,
  ValidationRule,
  ConditionalRule,
} from "./schema.js";

interface FieldOpts {
  required?: boolean;
  label: string;
  description?: string;
  format?: string;
  examples?: unknown[];
  validation?: ValidationRule[];
  default?: unknown;
  dependsOn?: FieldDefinition["dependsOn"];
}

interface SelectOpts extends FieldOpts {
  options: (string | FieldOption)[];
}

interface ArrayOpts extends FieldOpts {
  minItems?: number;
  maxItems?: number;
  fields: (builder: FormBuilder) => FormBuilder;
}

function normalizeOptions(options: (string | FieldOption)[]): FieldOption[] {
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
}

function buildField(id: string, type: FieldDefinition["type"], opts: FieldOpts): FieldDefinition {
  const field: FieldDefinition = {
    id,
    type,
    label: opts.label,
    required: opts.required ?? false,
  };
  if (opts.description !== undefined) field.description = opts.description;
  if (opts.format !== undefined) field.format = opts.format;
  if (opts.examples !== undefined) field.examples = opts.examples;
  if (opts.validation !== undefined) field.validation = opts.validation;
  if (opts.default !== undefined) field.default = opts.default;
  if (opts.dependsOn !== undefined) field.dependsOn = opts.dependsOn;
  return field;
}

export class FormBuilder {
  private _id: string;
  private _name: string;
  private _description = "";
  private _instructions?: string;
  private _fields: FieldDefinition[] = [];
  private _rules: ConditionalRule[] = [];
  private _metadata?: Record<string, unknown>;
  private _version = 1;

  private constructor(id: string) {
    this._id = id;
    this._name = id;
  }

  static create(id: string): FormBuilder {
    return new FormBuilder(id);
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  describe(description: string): this {
    this._description = description;
    return this;
  }

  instruct(instructions: string): this {
    this._instructions = instructions;
    return this;
  }

  version(v: number): this {
    this._version = v;
    return this;
  }

  metadata(meta: Record<string, unknown>): this {
    this._metadata = meta;
    return this;
  }

  // --- Scalar fields ---

  text(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "text", opts));
    return this;
  }

  textarea(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "textarea", opts));
    return this;
  }

  number(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "number", opts));
    return this;
  }

  boolean(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "boolean", opts));
    return this;
  }

  email(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "email", { ...opts, format: "email" }));
    return this;
  }

  phone(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "phone", { ...opts, format: "phone" }));
    return this;
  }

  url(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "url", { ...opts, format: "url" }));
    return this;
  }

  date(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "date", { ...opts, format: "date" }));
    return this;
  }

  datetime(id: string, opts: FieldOpts = { label: id }): this {
    this._fields.push(buildField(id, "datetime", { ...opts, format: "datetime" }));
    return this;
  }

  // --- Complex fields ---

  select(id: string, opts: SelectOpts): this {
    const field = buildField(id, "select", opts);
    field.options = normalizeOptions(opts.options);
    this._fields.push(field);
    return this;
  }

  multiSelect(id: string, opts: SelectOpts): this {
    const field = buildField(id, "multi-select", opts);
    field.options = normalizeOptions(opts.options);
    this._fields.push(field);
    return this;
  }

  group(id: string, build: (g: FormBuilder) => FormBuilder, opts?: { describe?: string }): this {
    const sub = new FormBuilder(id);
    build(sub);
    const field: FieldDefinition = {
      id,
      type: "group",
      label: opts?.describe ?? id,
      required: false,
      fields: sub._fields,
    };
    if (opts?.describe) field.description = opts.describe;
    this._fields.push(field);
    return this;
  }

  array(id: string, opts: ArrayOpts): this {
    const sub = new FormBuilder(id);
    opts.fields(sub);
    const field = buildField(id, "array", opts);
    field.itemFields = sub._fields;
    if (opts.minItems !== undefined) field.minItems = opts.minItems;
    if (opts.maxItems !== undefined) field.maxItems = opts.maxItems;
    this._fields.push(field);
    return this;
  }

  // --- Rules ---

  rule(rule: ConditionalRule): this {
    this._rules.push(rule);
    return this;
  }

  // --- Build ---

  build(): Readonly<FormSchema> {
    const schema: FormSchema = {
      id: this._id,
      version: this._version,
      name: this._name,
      description: this._description,
      fields: this._fields,
    };
    if (this._instructions) schema.instructions = this._instructions;
    if (this._rules.length > 0) schema.rules = this._rules;
    if (this._metadata) schema.metadata = this._metadata;
    return Object.freeze(schema);
  }
}
