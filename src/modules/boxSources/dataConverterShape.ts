const TOML_BASIC_KEY = String.raw`"(?:\\[^\n]|[^"\\\n])*"`;
const TOML_LITERAL_KEY = String.raw`'[^'\n]*'`;
const TOML_KEY = `(?:[A-Za-z0-9_-]+|${TOML_BASIC_KEY}|${TOML_LITERAL_KEY})`;
const TOML_SHAPE = new RegExp(
  String.raw`^[ \t]*(?:\[\[?.+\]\]?[ \t]*(?:#.*)?$|${TOML_KEY}(?:[ \t]*\.[ \t]*${TOML_KEY})*[ \t]*=)`,
  'm',
);

export function hasTomlDocumentShape(input: string): boolean {
  return TOML_SHAPE.test(input);
}
