import type { FormSchema } from "../schema.js";
import { generateClaudeToolSchema } from "./claude.js";

export interface OpenAIFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export function generateOpenAIToolSchema(schema: Readonly<FormSchema>): OpenAIFunctionDefinition {
  // OpenAI format wraps the same JSON Schema in a different envelope
  const claude = generateClaudeToolSchema(schema);

  return {
    type: "function",
    function: {
      name: claude.name,
      description: claude.description,
      parameters: claude.input_schema,
    },
  };
}
