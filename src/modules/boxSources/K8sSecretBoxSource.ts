import { decodeBase64 } from '@functions/base64';
import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { errorBox, keyValueBox } from '@modules/Box';

const PriorityK8sSecret = 10;
const InvalidBase64 = '<invalid-base64>';
const InvalidValue = '<invalid-value>';
const UnreadableString = '<unreadable-string>';

const yamlKindLine =
  /^[ \t]*(?:-[ \t]*)?(?:["']?kind["']?)[ \t]*:[ \t]*["']?(?:Secret|List)["']?(?:[ \t]*(?:#.*)?\r?$)/m;
const flowYamlKindProperty =
  /(?:^|[,{}])[ \t]*(?:["']?kind["']?)[ \t]*:[ \t]*["']?(?:Secret|List)["']?(?=[ \t]*(?:[,}]|$))/m;
const jsonKindProperty =
  /["']kind["'][ \t]*:[ \t]*["'](?:Secret|List)["'](?=[ \t]*[,}])/;

type UnknownRecord = Record<string, unknown>;

interface Match {
  data: Record<string, string>;
  name?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSecretResource(value: unknown): value is UnknownRecord {
  if (
    !isRecord(value) ||
    value.apiVersion !== 'v1' ||
    value.kind !== 'Secret'
  ) {
    return false;
  }

  return (
    (value.metadata === undefined || isRecord(value.metadata)) &&
    (value.data === undefined || isRecord(value.data)) &&
    (value.stringData === undefined || isRecord(value.stringData))
  );
}

function extractSecretResources(value: unknown): UnknownRecord[] {
  if (isSecretResource(value)) {
    return [value];
  }

  if (
    !isRecord(value) ||
    value.apiVersion !== 'v1' ||
    value.kind !== 'List' ||
    !Array.isArray(value.items)
  ) {
    return [];
  }

  return value.items.filter(isSecretResource);
}

function decodeDataValue(value: unknown): string {
  if (typeof value !== 'string') {
    return InvalidBase64;
  }

  try {
    const { readableText } = decodeBase64(value.replace(/\s/g, ''), {
      allowMissingPadding: false,
      allowUrlSafe: false,
      allowWhitespace: false,
    });
    return readableText ?? UnreadableString;
  } catch {
    return InvalidBase64;
  }
}

function decodeSecret(resource: UnknownRecord): Match {
  const data = Object.create(null) as Record<string, string>;

  if (isRecord(resource.data)) {
    for (const [key, value] of Object.entries(resource.data)) {
      data[key] = decodeDataValue(value);
    }
  }

  if (isRecord(resource.stringData)) {
    for (const [key, value] of Object.entries(resource.stringData)) {
      data[key] = typeof value === 'string' ? value : InvalidValue;
    }
  }

  const metadata = resource.metadata;
  const name =
    isRecord(metadata) && typeof metadata.name === 'string'
      ? metadata.name
      : undefined;

  return { data, name };
}

function isPlausibleSecretInput(input: string): boolean {
  return (
    yamlKindLine.test(input) ||
    flowYamlKindProperty.test(input) ||
    jsonKindProperty.test(input)
  );
}

async function parseMatches(input: string): Promise<Match[]> {
  if (
    !isString(input) ||
    trim(input) === '' ||
    !isPlausibleSecretInput(input)
  ) {
    return [];
  }

  try {
    const { parseAllDocuments } = await import('yaml');
    const documents = parseAllDocuments(input);
    const resources: UnknownRecord[] = [];

    for (const document of documents) {
      if (document.errors.length > 0) {
        return [];
      }
      resources.push(...extractSecretResources(document.toJS()));
    }

    return resources.map(decodeSecret);
  } catch {
    return [];
  }
}

export const K8sSecretBoxSource = {
  name: 'K8s Secret',
  description: 'Base64-decode all values inside a Kubernetes Secret YAML.',
  tag: '⎈',
  kind: 'Decode',
  defaultInput: `apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  username: dXNlcg==
  password: cGFzc3dvcmQ=`,
  priority: PriorityK8sSecret,

  async checkMatch(input: string): Promise<Match | undefined> {
    const matches = await parseMatches(input);
    return matches[0];
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const matches = await parseMatches(input);
    if (matches.length === 0) {
      return [];
    }

    const multiple = matches.length > 1;
    return matches.map((match, index) => {
      const name =
        multiple && match.name
          ? `Kubernetes Secret: ${match.name}`
          : multiple
            ? `Kubernetes Secret #${index + 1}`
            : 'Kubernetes Secret';

      if (Object.keys(match.data).length === 0) {
        return errorBox(
          name,
          'Secret contains no data or stringData entries.',
          {
            priority: this.priority,
          },
        );
      }

      return keyValueBox('keyValue', name, match.data, {
        priority: this.priority,
      });
    });
  },
};

export default K8sSecretBoxSource;
