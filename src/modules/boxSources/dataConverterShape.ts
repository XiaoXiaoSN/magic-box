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

function yamlStructuralLines(input: string): string[] {
  return input.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('#');
  });
}

export function hasYamlDocumentShape(input: string): boolean {
  const lines = yamlStructuralLines(input);
  if (lines.length < 2) return false;

  let structuralLines = 0;
  let hasNestedStructure = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '...') continue;
    if (/^[-?]\s+/.test(trimmed)) structuralLines += 1;
    if (/^[^\s:#][^:\n]*:\s*/.test(trimmed)) structuralLines += 1;
    if (/^\s+[^\s:#][^:\n]*:\s*/.test(line)) hasNestedStructure = true;
  }
  return structuralLines >= 2 || hasNestedStructure;
}

const XML_NAME = '[A-Za-z_][A-Za-z0-9_.:-]*';
const XML_ELEMENT = new RegExp(
  String.raw`^<(${XML_NAME})(?:\s[^<>]*)?>(?:[\s\S]*)</\1>$|^<${XML_NAME}(?:\s[^<>]*)?\s*/>$`,
);

export function hasXmlDocumentShape(input: string): boolean {
  const withoutDeclaration = input.trim().replace(/^<\?xml\b[^?]*\?>\s*/i, '');
  return XML_ELEMENT.test(withoutDeclaration);
}
