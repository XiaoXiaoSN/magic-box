import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import {
  type ParseOptions,
  parse as parseYaml,
  type SchemaOptions,
  stringify as stringifyYaml,
  type ToJSOptions,
} from 'yaml';

const PriorityDataConverter = 10;

enum DataFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  XML = 'xml',
}

// YAML 1.2 dropped merge keys from the core schema, so the `yaml` package
// disables them by default. Every real-world producer (k8s, docker-compose, CI
// configs) still relies on `<<: *anchor`, so enable them explicitly; docs that
// carry an explicit `%YAML 1.1` directive keep working unchanged.
//
// maxAliasCount is an expansion-cost budget (references x anchored-node size),
// not an alias count. The library default of 100 rejects legitimate configs
// that reuse a handful of anchors heavily, so raise it well above that while
// still refusing exponential alias bombs.
const yamlParseOptions: ParseOptions & SchemaOptions & ToJSOptions = {
  merge: true,
  maxAliasCount: 2500,
};

interface DetectedData {
  format: DataFormat;
  data: unknown;
}

interface FormatError {
  format: DataFormat;
  message: string;
}

// Detection succeeded, or it failed and carries the errors from every parser
// whose gate matched — the caller decides whether those are worth surfacing.
type DetectResult =
  | { ok: true; detected: DetectedData }
  | { ok: false; errors: FormatError[] };

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '    ',
});

function detectFormat(input: string): DetectResult {
  const trimmed = trim(input);
  const errors: FormatError[] = [];
  if (!trimmed) return { ok: false, errors };

  // Try JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const data = JSON.parse(trimmed);
      if (data && typeof data === 'object') {
        return { ok: true, detected: { format: DataFormat.JSON, data } };
      }
    } catch (e) {
      errors.push({ format: DataFormat.JSON, message: errorMessage(e) });
    }
  }

  // Try XML
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    try {
      const data = xmlParser.parse(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return { ok: true, detected: { format: DataFormat.XML, data } };
      }
    } catch (e) {
      errors.push({ format: DataFormat.XML, message: errorMessage(e) });
    }
  }

  // Try TOML
  if (trimmed.includes('=') || trimmed.startsWith('[')) {
    try {
      const data = parseToml(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return { ok: true, detected: { format: DataFormat.TOML, data } };
      }
    } catch (e) {
      errors.push({ format: DataFormat.TOML, message: errorMessage(e) });
    }
  }

  // Try YAML
  try {
    const data = parseYaml(trimmed, yamlParseOptions);
    // YAML is very permissive, we only accept objects/arrays and exclude simple primitives
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      // Additional check to avoid false positives for simple strings that YAML might parse
      if (typeof data === 'object') {
        return { ok: true, detected: { format: DataFormat.YAML, data } };
      }
    }
  } catch (e) {
    errors.push({ format: DataFormat.YAML, message: errorMessage(e) });
  }

  return { ok: false, errors };
}

// Ranks the collected errors by how specific the parser's gate was, so a
// YAML document that tokenized and then failed wins over TOML, whose gate is a
// bare `=` check and fires on almost any text.
const ERROR_PRIORITY = [
  DataFormat.JSON,
  DataFormat.XML,
  DataFormat.YAML,
  DataFormat.TOML,
];

function describeDetectFailure(errors: FormatError[]): string {
  const best = ERROR_PRIORITY.map((format) =>
    errors.find((e) => e.format === format),
  ).find((e) => e !== undefined);

  if (!best) {
    return 'Input is not recognizable as JSON, YAML, TOML or XML.';
  }
  return `Failed to parse input as ${best.format.toUpperCase()}: ${best.message}`;
}

const FORMATS = [
  {
    id: DataFormat.JSON,
    name: 'JSON',
    keys: ['json', 'tojson'],
    stringify: (d: unknown) => JSON.stringify(d, null, '    '),
  },
  {
    id: DataFormat.YAML,
    name: 'YAML',
    keys: ['yaml', 'yml', 'toyaml', 'toyml'],
    stringify: (d: unknown) => stringifyYaml(d),
  },
  {
    id: DataFormat.TOML,
    name: 'TOML',
    keys: ['toml', 'totoml'],
    stringify: (d: unknown) => {
      try {
        return stringifyToml(d as Record<string, unknown>);
      } catch (e) {
        console.error('TOML stringify failed:', e);
        return undefined;
      }
    },
  },
  {
    id: DataFormat.XML,
    name: 'XML',
    keys: ['xml', 'toxml'],
    stringify: (d: unknown) => {
      try {
        const wrapData = Array.isArray(d)
          ? { root: { item: d } }
          : Object.keys(d as object).length > 1
            ? { root: d }
            : d;
        return xmlBuilder.build(wrapData);
      } catch (e) {
        console.error('XML build failed:', e);
        return undefined;
      }
    },
  },
];

export const DataConverterBoxSource = {
  name: 'Data Converter',
  description: 'Pretty-print and convert between JSON, YAML, TOML and XML.',
  defaultInput:
    '{"name":"John Doe","age":30,"isStudent":false,"courses":[{"name":"History","credits":3},{"name":"Math","credits":4}]}\n\n::toYAML\n::toTOML\n::toXML',
  tag: '{ }',
  kind: 'Format',
  priority: PriorityDataConverter,

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    if (!isString(input)) return [];

    const hasAnyTargetOption = FORMATS.some((fmt) =>
      hasOptionKeys(options, ...fmt.keys),
    );

    const result = detectFormat(input);
    if (!result.ok) {
      // Silence is right while guessing the format — every unmatched keystroke
      // would otherwise raise an error. Once a `::toJSON`-style target is
      // explicit the intent is unambiguous, so report why parsing failed
      // instead of rendering nothing.
      if (!hasAnyTargetOption || trim(input) === '') return [];
      return [
        errorBox('Data Converter', describeDetectFailure(result.errors), {
          priority: PriorityDataConverter,
        }),
      ];
    }

    const { format: srcFormat, data } = result.detected;
    const boxes: Box[] = [];

    for (const fmt of FORMATS) {
      const isTargetRequested = hasOptionKeys(options, ...fmt.keys);
      const isSourceFormat = fmt.id === srcFormat;

      // If specific options are provided, only show those requested.
      // If NO specific options are provided, only show the "pretty" version of the source format.
      if (hasAnyTargetOption) {
        if (!isTargetRequested) continue;
      } else if (!isSourceFormat) {
        continue;
      }

      try {
        const output = fmt.stringify(data);
        if (output === undefined) continue;

        // For the source format, only show if it actually changed (formatted) the input
        if (isSourceFormat && trim(output) === trim(input)) {
          continue;
        }

        boxes.push(
          new BoxBuilder(`${fmt.name} Output`, output)
            .setOptions({ language: fmt.id })
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority + (isSourceFormat ? 0.1 : 0))
            .build(),
        );
      } catch (e) {
        console.error(`Conversion to ${fmt.name} failed:`, e);
      }
    }

    return boxes;
  },
};

export default DataConverterBoxSource;
