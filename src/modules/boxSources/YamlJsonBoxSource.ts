import YAML from 'yaml';

import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isJSON, isString, trim } from '@functions/helper';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

import type { Box, BoxOptions } from '@modules/Box';

const PriorityYamlJson = 15;

export const YamlJsonBoxSource = {
  name: 'YAML/JSON Converter',
  description: 'Convert between YAML and JSON format.',
  defaultInput: `{"ab": [1,2,3]}\n::yaml`,
  priority: PriorityYamlJson,

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    if (!isString(input) || trim(input) === '') {
      return [];
    }

    const boxes: Box[] = [];

    // JSON -> YAML
    if (hasOptionKeys(options, 'toyaml', 'toyml', 'yaml', 'yml')) {
      try {
        if (isJSON(input)) {
          const parsed = JSON.parse(input);
          const yamlStr = YAML.stringify(parsed);
          boxes.push(
            new BoxBuilder('JSON to YAML', yamlStr)
              .setOptions({ language: 'yaml' })
              .setTemplate(CodeBoxTemplate)
              .setPriority(this.priority)
              .build(),
          );
        }
      } catch {
        // ignore
      }
    }

    // YAML -> JSON
    if (hasOptionKeys(options, 'tojson', 'json')) {
      try {
        const parsed = YAML.parse(input);
        // YAML.parse can return simple types like string, number if input is just that.
        // If the result is an object/array, we definitely want it as JSON.
        // If the result is a string that is the same as input, it might not be very useful but requested.
        const jsonStr = JSON.stringify(parsed, null, 4);

        boxes.push(
          new BoxBuilder('YAML to JSON', jsonStr)
            .setOptions({ language: 'json' })
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        );
      } catch {
        // ignore
      }
    }

    return boxes;
  },
};

export default YamlJsonBoxSource;
