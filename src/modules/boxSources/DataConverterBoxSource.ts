import { isString, trim } from '@functions/helper';
import { JSON_TOOL_OPTION_KEYS } from '@functions/json/commands';
import { parseJson, stringifyJson } from '@functions/json/shared';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  isInteger,
  isLosslessNumber,
  isSafeNumber,
  LosslessNumber,
} from 'lossless-json';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import {
  type Document,
  isMap,
  isScalar,
  isSeq,
  type ParseOptions,
  parseAllDocuments,
  Scalar,
  type SchemaOptions,
  stringify as stringifyYaml,
  type ToJSOptions,
} from 'yaml';

import {
  hasTomlDocumentShape,
  hasXmlDocumentShape,
  hasYamlDocumentShape,
} from './dataConverterShape';

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
  intAsBigInt: true,
};

const AUTO_INPUT_LIMIT = 256 * 1024;
const EXPLICIT_INPUT_LIMIT = 1024 * 1024;
interface DetectedData {
  format: DataFormat;
  data: unknown;
  // true when the source was a YAML stream of several `---`-separated
  // documents, in which case `data` is the array of their values.
  multiDocument: boolean;
  yamlDocuments?: readonly Document[];
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
  parseTagValue: false,
  parseAttributeValue: false,
});
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '    ',
});

function isEmptyYamlDocument(document: Document): boolean {
  return (
    isScalar(document.contents) &&
    document.contents.value === null &&
    document.contents.source === ''
  );
}

function yamlScalarValue(source: string, value: unknown): unknown {
  if (typeof value === 'bigint') return new LosslessNumber(value.toString());
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  if (!source || !isSafeNumber(source))
    return new LosslessNumber(String(value));
  try {
    return new LosslessNumber(source);
  } catch {
    return new LosslessNumber(String(value));
  }
}

function setLosslessYamlScalars(node: unknown): Array<[Scalar, unknown]> {
  const changed: Array<[Scalar, unknown]> = [];
  if (isScalar(node)) {
    if (
      node.type === Scalar.PLAIN &&
      (typeof node.value === 'number' || typeof node.value === 'bigint')
    ) {
      changed.push([node, node.value]);
      node.value = yamlScalarValue(node.source ?? '', node.value);
    }
    return changed;
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      changed.push(...setLosslessYamlScalars(pair.key));
      changed.push(...setLosslessYamlScalars(pair.value));
    }
  } else if (isSeq(node)) {
    for (const item of node.items)
      changed.push(...setLosslessYamlScalars(item));
  }
  return changed;
}

function yamlDocumentsToLosslessData(
  documents: readonly Document[],
  multiDocument: boolean,
): unknown {
  const values = documents.map((document) => {
    const changed = setLosslessYamlScalars(document.contents);
    try {
      return document.toJS(yamlParseOptions);
    } finally {
      for (const [node, value] of changed.reverse()) node.value = value;
    }
  });
  return multiDocument ? values : values[0];
}

function stringifyYamlDocuments(documents: readonly Document[]): string {
  return documents
    .map((document, index) => {
      const output = document.toString();
      return index === 0 ? output : output.replace(/^---\s*\r?\n/, '');
    })
    .join('---\n');
}

function yamlCompatibleValue(value: unknown): unknown {
  if (isLosslessNumber(value)) {
    const raw = value.toString();
    if (isInteger(raw)) return BigInt(raw);
    if (!isSafeNumber(raw)) {
      throw new Error(`number ${raw} cannot be represented losslessly in YAML`);
    }
    const scalar = new Scalar(Number(raw));
    const fraction = raw.match(/^[+-]?\d+\.(\d+)(?:[eE][+-]?\d+)?$/)?.[1];
    if (fraction) scalar.minFractionDigits = fraction.length;
    return scalar;
  }
  if (Array.isArray(value)) return value.map(yamlCompatibleValue);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(value)) {
      result[key] = yamlCompatibleValue(
        (value as Record<string, unknown>)[key],
      );
    }
    return result;
  }
  return value;
}

interface TomlNumberPlaceholders {
  values: Map<string, string>;
  used: Set<string>;
}

function collectTomlStrings(value: unknown, used: Set<string>): void {
  if (typeof value === 'string') {
    used.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTomlStrings(item, used);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      used.add(key);
      collectTomlStrings((value as Record<string, unknown>)[key], used);
    }
  }
}

function tomlNumberPlaceholder(
  raw: string,
  placeholders: TomlNumberPlaceholders,
): string {
  let index = placeholders.values.size;
  let placeholder = `__magic_box_number_${index}__`;
  while (placeholders.used.has(placeholder)) {
    index += 1;
    placeholder = `__magic_box_number_${index}__`;
  }
  placeholders.values.set(placeholder, raw);
  placeholders.used.add(placeholder);
  return placeholder;
}

function tomlCompatibleValue(
  value: unknown,
  placeholders: TomlNumberPlaceholders,
): unknown {
  if (isLosslessNumber(value)) {
    const raw = value.toString();
    return tomlNumberPlaceholder(raw, placeholders);
  }
  if (value === null) throw new Error('TOML cannot represent null values');
  if (Array.isArray(value)) {
    return value.map((item) => tomlCompatibleValue(item, placeholders));
  }
  if (typeof value === 'bigint') return value;
  if (typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(value)) {
      result[key] = tomlCompatibleValue(
        (value as Record<string, unknown>)[key],
        placeholders,
      );
    }
    return result;
  }
  return value;
}

function stringifyTomlLossless(value: unknown): string {
  const placeholders: TomlNumberPlaceholders = {
    values: new Map(),
    used: new Set(),
  };
  collectTomlStrings(value, placeholders.used);
  const prepared = tomlCompatibleValue(value, placeholders);
  let output = stringifyToml(prepared as Record<string, unknown>);
  for (const [placeholder, raw] of placeholders.values) {
    output = output.replaceAll(JSON.stringify(placeholder), raw);
  }
  return output;
}

function xmlCompatibleValue(value: unknown): unknown {
  if (isLosslessNumber(value)) return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (value === null) throw new Error('XML cannot represent null values');
  if (Array.isArray(value)) return value.map(xmlCompatibleValue);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(value)) {
      result[key] = xmlCompatibleValue((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

function detectFormat(
  input: string,
  allowSingleLineYaml: boolean,
): DetectResult {
  const trimmed = trim(input);
  const errors: FormatError[] = [];
  if (!trimmed) return { ok: false, errors };

  // Try JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const data = parseJson(trimmed);
      if (data && typeof data === 'object') {
        return {
          ok: true,
          detected: { format: DataFormat.JSON, data, multiDocument: false },
        };
      }
    } catch (e) {
      errors.push({ format: DataFormat.JSON, message: errorMessage(e) });
    }
  }

  // Try XML
  if (
    hasXmlDocumentShape(trimmed) ||
    (allowSingleLineYaml && trimmed.startsWith('<') && trimmed.endsWith('>'))
  ) {
    try {
      const validation = XMLValidator.validate(trimmed);
      if (validation !== true) {
        throw new Error(validation.err.msg);
      }
      const data = xmlParser.parse(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return {
          ok: true,
          detected: { format: DataFormat.XML, data, multiDocument: false },
        };
      }
    } catch (e) {
      errors.push({ format: DataFormat.XML, message: errorMessage(e) });
    }
  }

  // Try TOML
  if (hasTomlDocumentShape(trimmed)) {
    try {
      const data = parseToml(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return {
          ok: true,
          detected: { format: DataFormat.TOML, data, multiDocument: false },
        };
      }
    } catch (e) {
      errors.push({ format: DataFormat.TOML, message: errorMessage(e) });
    }
  }

  // Try YAML
  if (!allowSingleLineYaml && !hasYamlDocumentShape(trimmed)) {
    return { ok: false, errors };
  }
  try {
    // parseAllDocuments rather than parse, so a `---`-separated stream is not
    // rejected outright. It collects syntax errors instead of throwing, while
    // toJS() still throws on things like an alias reaching across documents —
    // both have to be handled for broken input to reach the error box.
    const documents = parseAllDocuments(trimmed, yamlParseOptions);
    const failed = documents.find((doc) => doc.errors.length > 0);
    if (failed) throw failed.errors[0];

    // a trailing `---` yields an empty document; drop only those markers while
    // retaining explicit null documents for conversions that can represent them.
    const retainedDocuments = documents.filter(
      (document) => !isEmptyYamlDocument(document),
    );
    const values = retainedDocuments.map((doc) => doc.toJS(yamlParseOptions));

    const multiDocument = values.length > 1;
    const data = multiDocument ? values : values[0];
    // YAML is very permissive, we only accept objects/arrays and exclude simple primitives
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      return {
        ok: true,
        detected: {
          format: DataFormat.YAML,
          data,
          multiDocument,
          yamlDocuments: retainedDocuments,
        },
      };
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

interface OutputFormat {
  id: DataFormat;
  name: string;
  keys: string[];
  // Throws when the data cannot be represented; the caller turns that into a
  // visible error rather than an empty result.
  stringify: (data: unknown, multiDocument: boolean) => string;
}

const FORMATS: readonly OutputFormat[] = [
  {
    id: DataFormat.JSON,
    name: 'JSON',
    keys: ['json', 'tojson'],
    stringify: (d) => stringifyJson(d, '    '),
  },
  {
    id: DataFormat.YAML,
    name: 'YAML',
    keys: ['yaml', 'yml', 'toyaml', 'toyml'],
    // a multi-document source round-trips back to a `---`-separated stream
    // rather than collapsing into a single sequence node
    stringify: (d, multiDocument) =>
      multiDocument && Array.isArray(d)
        ? d.map((doc) => stringifyYaml(yamlCompatibleValue(doc))).join('---\n')
        : stringifyYaml(yamlCompatibleValue(d)),
  },
  {
    id: DataFormat.TOML,
    name: 'TOML',
    keys: ['toml', 'totoml'],
    stringify: (d) => stringifyTomlLossless(d),
  },
  {
    id: DataFormat.XML,
    name: 'XML',
    keys: ['xml', 'toxml'],
    stringify: (d) => {
      const xmlData = xmlCompatibleValue(d);
      const wrapData = Array.isArray(xmlData)
        ? { root: { item: xmlData } }
        : Object.keys(xmlData as object).length > 1
          ? { root: xmlData }
          : xmlData;
      return xmlBuilder.build(wrapData);
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

    // a JSON Tools directive (::jsonpick, ::jsonmerge, ...) already says what to
    // do with this input; the auto-format guess would only add a prettified
    // copy of the source (or a YAML reading of `---`-separated documents)
    // next to the requested result
    if (!hasAnyTargetOption && hasOptionKeys(options, ...JSON_TOOL_OPTION_KEYS))
      return [];

    const inputSize = input.length;
    if (
      inputSize > (hasAnyTargetOption ? EXPLICIT_INPUT_LIMIT : AUTO_INPUT_LIMIT)
    ) {
      if (!hasAnyTargetOption) return [];
      return [
        errorBox(
          'Data Converter',
          `Input is too large (${inputSize} characters, limit ${hasAnyTargetOption ? EXPLICIT_INPUT_LIMIT : AUTO_INPUT_LIMIT}).`,
          { priority: PriorityDataConverter },
        ),
      ];
    }

    const result = detectFormat(input, hasAnyTargetOption);
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

    const {
      format: srcFormat,
      data,
      multiDocument,
      yamlDocuments,
    } = result.detected;
    const conversionData =
      srcFormat === DataFormat.YAML && yamlDocuments
        ? yamlDocumentsToLosslessData(yamlDocuments, multiDocument)
        : data;
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
        const output =
          fmt.id === DataFormat.YAML &&
          srcFormat === DataFormat.YAML &&
          yamlDocuments
            ? stringifyYamlDocuments(yamlDocuments)
            : fmt.stringify(conversionData, multiDocument);
        if (output.trim() === '') {
          throw new Error(`${fmt.name} cannot represent this value`);
        }

        // For the source format, only show if it actually changed (formatted) the input
        if (isSourceFormat && trim(output) === trim(input)) {
          continue;
        }

        boxes.push(
          new BoxBuilder(`${fmt.name} Output`, output)
            .setOptions({ language: fmt.id })
            .setView('code')
            .setPriority(this.priority + (isSourceFormat ? 0.1 : 0))
            .build(),
        );
      } catch (e) {
        console.error(`Conversion to ${fmt.name} failed:`, e);
        // Same rule as a detection failure: only an explicit target deserves an
        // error. TOML in particular cannot hold a top-level array, which is
        // exactly what a multi-document YAML stream produces.
        if (isTargetRequested) {
          boxes.push(
            errorBox(
              'Data Converter',
              `Cannot convert to ${fmt.name}: ${errorMessage(e)}`,
              { priority: PriorityDataConverter },
            ),
          );
        }
      }
    }

    return boxes;
  },
};

export default DataConverterBoxSource;
