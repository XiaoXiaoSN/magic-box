import { parse } from 'yaml';

import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { decodeBase64 } from '@functions/base64';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityK8sSecret = 10;

interface Match {
  data: Record<string, string>;
}

export const K8sSecretBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    try {
      const resource = parse(input);
      if (resource.apiVersion !== 'v1' || resource.kind !== 'Secret') {
        return undefined;
      }

      const data: Record<string, string> = {};

      if (resource.data) {
        Object.entries(resource.data).forEach(([key, rawValue]) => {
          try {
            const { readableText } = decodeBase64(rawValue as string);
            data[key] = readableText ?? '<unreadable-string>';
          } catch {
            data[key] = '<invalid-base64>';
          }
        });
      }
      if (resource.stringData) {
        Object.entries(resource.stringData).forEach(([key, value]) => {
          data[key] = value as string;
        });
      }

      return { data };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    return [
      new BoxBuilder('Kubernetes Secret', '')
        .setOptions(match.data)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(PriorityK8sSecret)
        .build(),
    ];
  },
};

export default K8sSecretBoxSource;
