import {
  CSV_EXCLUSIVE_OPTION_KEYS,
  csvOwnsJsonOutput,
} from '@functions/csv/commands';
import { isString, trim } from '@functions/helper';
import { JSON_TOOL_OPTION_KEYS } from '@functions/json/commands';
import { parseJson, stringifyJson } from '@functions/json/shared';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';
import { isInteger, isLosslessNumber, LosslessNumber } from 'lossless-json';
import {
  parse as parseToml,
  stringify as stringifyToml,
  TomlDate,
} from 'smol-toml';
import {
  type Document,
  isScalar,
  type ParseOptions,
  parseAllDocuments,
  Scalar,
  type ScalarTag,
  type SchemaOptions,
  stringify as stringifyYaml,
  type ToJSOptions,
} from 'yaml';

import {
  hasTomlDocumentShape,
  hasXmlDocumentShape,
  hasYamlDocumentShape,
} from './dataConverterShape';
import {
  buildXml,
  invalidXmlName,
  parseXmlDocument,
  type XmlDocument,
} from './dataConverterXml';

enum DataFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  XML = 'xml',
}

const YAML_FLOAT_TAG = 'tag:yaml.org,2002:float';

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
  uniqueKeys: (a, b) =>
    a === b ||
    (isScalar(a) && isScalar(b) && areYamlScalarValuesEqual(a.value, b.value)),
  customTags: (tags) =>
    tags.map((tag) => {
      if (
        typeof tag === 'string' ||
        tag.collection ||
        tag.tag !== YAML_FLOAT_TAG
      ) {
        return tag;
      }
      return {
        ...tag,
        identify: (value) =>
          value instanceof LosslessNumber || !!tag.identify?.(value),
        resolve(source, ...args) {
          const lexeme = yamlFloatLexeme(source, tag.format);
          return lexeme === undefined
            ? tag.resolve(source, ...args)
            : new LosslessNumber(lexeme);
        },
        stringify(node, ...args) {
          if (node.source && !/\s/.test(node.source)) return node.source;
          if (node.value instanceof LosslessNumber)
            return node.value.toString();
          return tag.stringify?.(node, ...args) ?? String(node.value);
        },
      } satisfies ScalarTag;
    }),
};

const losslessYamlNumberTag: ScalarTag = {
  tag: YAML_FLOAT_TAG,
  default: true,
  identify: (value) => value instanceof LosslessNumber,
  resolve: (source) => new LosslessNumber(source),
  stringify: ({ value }) => String(value),
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
  xmlDocument?: XmlDocument;
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

function isEmptyYamlDocument(document: Document): boolean {
  return (
    isScalar(document.contents) &&
    document.contents.value === null &&
    document.contents.source === ''
  );
}

function yamlFloatLexeme(
  source: string,
  format: string | undefined,
): string | undefined {
  const raw = source.trimEnd().replaceAll('_', '');
  if (format === 'TIME') {
    // YAML 1.1 sexagesimal fractions use units of 60 to the left of the dot.
    const [whole, fraction] = raw.replace(/^[-+]/, '').split('.');
    const seconds = whole
      .split(':')
      .reduce((total, part) => total * 60n + BigInt(part), 0n);
    return `${raw.startsWith('-') ? '-' : ''}${seconds}.${fraction || '0'}`;
  }

  const decimal = /^([-+]?)(\d*)(?:\.(\d*))?([eE][-+]?\d+)?$/.exec(raw);
  if (!decimal) return undefined;
  const [, sign, whole, fraction, exponent = ''] = decimal;
  if (!whole && !fraction) return undefined;
  const integer = whole.replace(/^0+(?=\d)/, '') || '0';
  return `${sign === '-' ? '-' : ''}${integer}${fraction === undefined ? '' : `.${fraction || '0'}`}${exponent}`;
}

// The parser compares each scalar map key with earlier keys. Cache the
// canonical form so spelling or a large exponent does not require repeated work.
const yamlNumberKeys = new WeakMap<LosslessNumber, string>();

function yamlNumberKey(value: LosslessNumber): string {
  const previous = yamlNumberKeys.get(value);
  if (previous !== undefined) return previous;

  const key = decimalNumberKey(value.toString());
  yamlNumberKeys.set(value, key);
  return key;
}

function decimalNumberKey(raw: string): string {
  const [mantissa, exponent = '0'] = raw.split(/[eE]/);
  const [whole, fraction = ''] = mantissa.replace(/^-/, '').split('.');
  const digits = (whole + fraction).replace(/^0+/, '');
  let length = digits.length;
  while (digits[length - 1] === '0') length -= 1;

  if (length === 0) return '0';
  const power =
    BigInt(exponent) + BigInt(digits.length - length - fraction.length);
  const sign = mantissa.startsWith('-') ? '-' : '';
  return `${sign}${digits.slice(0, length)}e${power}`;
}

function areYamlScalarValuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof LosslessNumber && b instanceof LosslessNumber) {
    return yamlNumberKey(a) === yamlNumberKey(b);
  }
  return a === b;
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
  if (value instanceof TomlDate) {
    // Quote dates so YAML 1.1 consumers also read them as strings.
    const scalar = new Scalar(value.toISOString());
    scalar.type = Scalar.QUOTE_DOUBLE;
    return scalar;
  }
  if (value instanceof LosslessNumber) return new Scalar(value);
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

function stringifyYamlLossless(value: unknown): string {
  return stringifyYaml(yamlCompatibleValue(value), {
    customTags: [losslessYamlNumberTag],
  });
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
  requireLosslessFloats: boolean,
): unknown {
  if (isLosslessNumber(value)) {
    const raw = value.toString();
    if (requireLosslessFloats && !isInteger(raw)) {
      const float = Number(raw);
      // TOML's float reader uses binary64. Keep the source spelling only if
      // reading it back preserves its decimal value.
      if (
        !Number.isFinite(float) ||
        decimalNumberKey(raw) !== decimalNumberKey(String(float))
      ) {
        throw new Error(`TOML cannot represent the number ${raw} losslessly.`);
      }
    }
    return tomlNumberPlaceholder(raw, placeholders);
  }
  if (value === null) throw new Error('TOML cannot represent null values');
  if (Array.isArray(value)) {
    return value.map((item) =>
      tomlCompatibleValue(item, placeholders, requireLosslessFloats),
    );
  }
  if (value instanceof TomlDate) return value;
  if (typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(value)) {
      result[key] = tomlCompatibleValue(
        (value as Record<string, unknown>)[key],
        placeholders,
        requireLosslessFloats,
      );
    }
    return result;
  }
  return value;
}

function stringifyTomlLossless(
  value: unknown,
  requireLosslessFloats: boolean,
): string {
  const placeholders: TomlNumberPlaceholders = {
    values: new Map(),
    used: new Set(),
  };
  collectTomlStrings(value, placeholders.used);
  const prepared = tomlCompatibleValue(
    value,
    placeholders,
    requireLosslessFloats,
  );
  let output = stringifyToml(prepared as Record<string, unknown>);
  for (const [placeholder, raw] of placeholders.values) {
    output = output.replaceAll(JSON.stringify(placeholder), raw);
  }
  return output;
}

function xmlCompatibleValue(value: unknown): unknown {
  if (isLosslessNumber(value)) return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof TomlDate) return value.toISOString();
  if (value === null) throw new Error('XML cannot represent null values');
  if (Array.isArray(value)) return value.map(xmlCompatibleValue);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(value)) {
      // Processing instructions and declarations belong to XML inputs only.
      if (key.startsWith('?')) invalidXmlName(key);
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
  if (hasXmlDocumentShape(trimmed)) {
    try {
      const xmlDocument = parseXmlDocument(trimmed);
      return {
        ok: true,
        detected: {
          format: DataFormat.XML,
          data: xmlDocument.data,
          multiDocument: false,
          xmlDocument,
        },
      };
    } catch (e) {
      errors.push({ format: DataFormat.XML, message: errorMessage(e) });
    }
  }

  // Try TOML
  if (hasTomlDocumentShape(trimmed)) {
    try {
      const data = parseToml(trimmed, { integersAsBigInt: 'asNeeded' });
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
    if (
      data &&
      typeof data === 'object' &&
      !(data instanceof LosslessNumber) &&
      Object.keys(data).length > 0
    ) {
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
  stringify: (
    data: unknown,
    multiDocument: boolean,
    sourceFormat: DataFormat,
  ) => string;
}

const FORMATS: readonly OutputFormat[] = [
  {
    id: DataFormat.JSON,
    name: 'JSON',
    keys: ['json', 'tojson'],
    stringify: (d) =>
      stringifyJson(d, '    ', (_key, value) => {
        if (typeof value === 'number' && !Number.isFinite(value)) {
          throw new Error(
            `JSON cannot represent the non-finite number ${value}.`,
          );
        }
        return value;
      }),
  },
  {
    id: DataFormat.YAML,
    name: 'YAML',
    keys: ['yaml', 'yml', 'toyaml', 'toyml'],
    // a multi-document source round-trips back to a `---`-separated stream
    // rather than collapsing into a single sequence node
    stringify: (d, multiDocument) =>
      multiDocument && Array.isArray(d)
        ? d.map(stringifyYamlLossless).join('---\n')
        : stringifyYamlLossless(d),
  },
  {
    id: DataFormat.TOML,
    name: 'TOML',
    keys: ['toml', 'totoml'],
    stringify: (d, _multiDocument, sourceFormat) =>
      stringifyTomlLossless(d, sourceFormat === DataFormat.YAML),
  },
  {
    id: DataFormat.XML,
    name: 'XML',
    keys: ['xml', 'toxml'],
    stringify: (d) => {
      const xmlData = xmlCompatibleValue(d);
      if (Array.isArray(xmlData)) {
        return buildXml({ root: { item: xmlData } });
      }
      const xmlObject = xmlData as Record<string, unknown>;
      const values = Object.values(xmlObject);
      // The builder emits each array item as a sibling with the same name.
      const needsRoot =
        values.length > 1 || (Array.isArray(values[0]) && values[0].length > 1);
      return buildXml(needsRoot ? { root: xmlObject } : xmlObject);
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

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    if (!isString(input)) return [];

    const csvOwnsJson = csvOwnsJsonOutput(input, options);
    const requestedFormats = FORMATS.filter(
      (fmt) =>
        hasOptionKeys(options, ...fmt.keys) &&
        !(fmt.id === DataFormat.JSON && csvOwnsJson),
    );
    if (csvOwnsJson && requestedFormats.length === 0) return [];
    const hasAnyTargetOption = requestedFormats.length > 0;

    // a JSON Tools or CSV Table directive (::jsonpick, ::csv, ...) already
    // says what to do with this input; the auto-format guess would only add a
    // prettified copy of the source (or a YAML reading of `---`-separated
    // documents) next to the requested result
    if (
      !hasAnyTargetOption &&
      hasOptionKeys(
        options,
        ...JSON_TOOL_OPTION_KEYS,
        ...CSV_EXCLUSIVE_OPTION_KEYS,
      )
    )
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
      return [errorBox('Data Converter', describeDetectFailure(result.errors))];
    }

    const {
      format: srcFormat,
      data,
      multiDocument,
      yamlDocuments,
      xmlDocument,
    } = result.detected;
    const boxes: Box[] = [];

    for (const fmt of FORMATS) {
      if (fmt.id === DataFormat.JSON && csvOwnsJson) continue;
      const isTargetRequested = requestedFormats.includes(fmt);
      const isSourceFormat = fmt.id === srcFormat;

      // If specific options are provided, only show those requested.
      // If NO specific options are provided, only show the "pretty" version of the source format.
      if (hasAnyTargetOption) {
        if (!isTargetRequested) continue;
      } else if (!isSourceFormat) {
        continue;
      }

      try {
        if (xmlDocument?.conversionError && !isSourceFormat) {
          throw new Error(xmlDocument.conversionError);
        }
        const output =
          fmt.id === DataFormat.XML && xmlDocument
            ? xmlDocument.formatted
            : fmt.id === DataFormat.YAML && yamlDocuments
              ? stringifyYamlDocuments(yamlDocuments)
              : fmt.stringify(data, multiDocument, srcFormat);
        if (output.trim() === '') {
          throw new Error(`${fmt.name} cannot represent this value`);
        }

        // Explicit XML formatting may preserve text exactly as entered.
        if (
          isSourceFormat &&
          trim(output) === trim(input) &&
          !(xmlDocument && isTargetRequested)
        ) {
          continue;
        }

        boxes.push(
          new BoxBuilder(`${fmt.name} Output`, output)
            .setOptions({ language: fmt.id })
            .setView('code')

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
            ),
          );
        }
      }
    }

    return boxes;
  },
};

export default DataConverterBoxSource;
