export interface FormatDefinition {
  validate: (value: unknown) => boolean;
  description: string;
}

const formats = new Map<string, FormatDefinition>();

export const FormatRegistry = {
  register(name: string, definition: FormatDefinition): void {
    formats.set(name, definition);
  },

  registerAll(defs: Record<string, FormatDefinition>): void {
    for (const [name, def] of Object.entries(defs)) {
      formats.set(name, def);
    }
  },

  get(name: string): FormatDefinition | undefined {
    return formats.get(name);
  },

  has(name: string): boolean {
    return formats.has(name);
  },

  reset(): void {
    formats.clear();
  },

  loadBuiltins(): void {
    const { builtinFormats } = require("./builtin.js");
    FormatRegistry.registerAll(builtinFormats);
  },

  list(): string[] {
    return [...formats.keys()];
  },
};
