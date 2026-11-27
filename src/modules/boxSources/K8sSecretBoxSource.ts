import { decodeBase64 } from '@functions/base64';
import { isString } from '@functions/helper';
import { isRecord, readKubernetesSecrets } from '@functions/kubernetesSecret';
import type { Box } from '@modules/Box';
import { errorBox, keyValueBox } from '@modules/Box';

const InvalidBase64 = '<invalid-base64>';
const InvalidValue = '<invalid-value>';
const UnreadableString = '<unreadable-string>';
interface Match {
  data: Record<string, string>;
  name?: string;
}

function decodeDataValue(value: unknown): string {
  if (typeof value !== 'string') {
    return InvalidBase64;
  }
  if (value === '') return '';

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

function decodeSecret(resource: Record<string, unknown>): Match {
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

function parseMatches(input: string): Match[] {
  if (!isString(input)) return [];
  return readKubernetesSecrets(input)
    .filter(
      ({ metadata, data, stringData }) =>
        (metadata === undefined || isRecord(metadata)) &&
        (data === undefined || isRecord(data)) &&
        (stringData === undefined || isRecord(stringData)),
    )
    .map(decodeSecret);
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

  async checkMatch(input: string): Promise<Match | undefined> {
    const matches = parseMatches(input);
    return matches[0];
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const matches = parseMatches(input);
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
        return errorBox(name, 'Secret contains no data or stringData entries.');
      }

      return keyValueBox('keyValue', name, match.data);
    });
  },
};

export default K8sSecretBoxSource;
