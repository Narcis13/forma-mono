export type {
  FieldType,
  FieldOption,
  ValidationRule,
  DependencyRule,
  ConditionalRule,
  FieldDefinition,
  FormSchema,
  FieldError,
  ValidationResult,
} from "./schema.js";

export { FormBuilder } from "./builder.js";
export { FormValidator } from "./validator.js";
export { FormIntrospector } from "./introspect.js";
export type { FormDescription } from "./introspect.js";
export { FormatRegistry } from "./formats/registry.js";
export type { FormatDefinition } from "./formats/registry.js";

import { generateClaudeToolSchema } from "./generators/claude.js";
import { generateOpenAIToolSchema } from "./generators/openai.js";
export type { ClaudeToolDefinition } from "./generators/claude.js";
export type { OpenAIFunctionDefinition } from "./generators/openai.js";

export const ToolSchemaGenerator = {
  claude: generateClaudeToolSchema,
  openai: generateOpenAIToolSchema,
};
