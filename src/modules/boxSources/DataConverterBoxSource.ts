import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const PriorityDataConverter = 10;

enum DataFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  XML = 'xml',
}

interface DetectedData {
  format: DataFormat;
  data: unknown;
}

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

function detectFormat(input: string): DetectedData | undefined {
  const trimmed = trim(input);
  if (!trimmed) return undefined;

  // Try JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const data = JSON.parse(trimmed);
      if (data && typeof data === 'object') {
        return { format: DataFormat.JSON, data };
      }
    } catch {
      /* ignore */
    }
  }

  // Try XML
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    try {
      const data = xmlParser.parse(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return { format: DataFormat.XML, data };
      }
    } catch {
      /* ignore */
    }
  }

  // Try TOML
  if (trimmed.includes('=') || trimmed.startsWith('[')) {
    try {
      const data = parseToml(trimmed);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return { format: DataFormat.TOML, data };
      }
    } catch {
      /* ignore */
    }
  }

  // Try YAML
  try {
    const data = parseYaml(trimmed);
    // YAML is very permissive, we only accept objects/arrays and exclude simple primitives
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      // Additional check to avoid false positives for simple strings that YAML might parse
      if (typeof data === 'object') {
        return { format: DataFormat.YAML, data };
      }
    }
  } catch {
    /* ignore */
  }

  return undefined;
}

export const DataConverterBoxSource = {
  name: 'Data Converter',
  description: 'Convert between JSON, YAML, TOML, and XML formats.',
  defaultInput:
    '{"name":"John Doe","age":30,"isStudent":false,"courses":[{"name":"History","credits":3},{"name":"Math","credits":4}]}\n\n::toYAML\n::toTOML\n::toXML',
  priority: PriorityDataConverter,

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    if (!isString(input)) return [];

    const detected = detectFormat(input);
    if (!detected) return [];

    const { format: srcFormat, data } = detected;
    const boxes: Box[] = [];

    const formats = [
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

    const hasAnyTargetOption = formats.some((fmt) =>
      hasOptionKeys(options, ...fmt.keys),
    );

    for (const fmt of formats) {
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
