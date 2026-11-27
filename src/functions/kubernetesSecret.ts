import { type Document, parseAllDocuments, visit } from 'yaml';

const maxAliasCount = 100;

const yamlKindLine =
  /^[ \t]*(?:-[ \t]*)?(?:["']?kind["']?)[ \t]*:[ \t]*["']?(?:Secret|List)["']?(?:[ \t]*(?:#.*)?\r?$)/m;
const flowYamlKindProperty =
  /(?:^|[,{}])[ \t]*(?:["']?kind["']?)[ \t]*:[ \t]*["']?(?:Secret|List)["']?(?=[ \t]*(?:[,}]|$))/m;
const jsonKindProperty =
  /["']kind["'][ \t]*:[ \t]*["'](?:Secret|List)["'](?=[ \t]*[,}])/;

type UnknownRecord = Record<string, unknown>;

const MAX_PRIVATE_PARSE_LENGTH = 64 * 1024;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSecretResource(value: unknown): value is UnknownRecord {
  return (
    isRecord(value) && value.apiVersion === 'v1' && value.kind === 'Secret'
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

function isPlausibleSecretInput(input: string): boolean {
  if (
    !input.includes('kind') ||
    (!input.includes('Secret') && !input.includes('List'))
  )
    return false;
  return (
    yamlKindLine.test(input) ||
    flowYamlKindProperty.test(input) ||
    jsonKindProperty.test(input)
  );
}

function convertSecretDocument(document: Document): unknown {
  // The YAML merge resolver bypasses the alias limit by converting the
  // source map directly. Limit repeated conversions for each source map.
  visit(document, {
    Map(_key, map) {
      const convert = map.toJSON.bind(map);
      let conversions = 0;
      map.toJSON = (...args) => {
        conversions += 1;
        if (conversions > maxAliasCount + 1) {
          throw new Error('YAML merge expansion limit exceeded');
        }
        return convert(...args);
      };
    },
  });
  return document.toJS({ maxAliasCount });
}

function parseCandidate(input: string): UnknownRecord[] | null {
  try {
    const documents = parseAllDocuments(input, { merge: true });
    const resources: UnknownRecord[] = [];
    for (const document of documents) {
      if (document.errors.length > 0) return null;
      resources.push(
        ...extractSecretResources(convertSecretDocument(document)),
      );
    }
    return resources;
  } catch {
    return null;
  }
}

export function readKubernetesSecrets(input: string): UnknownRecord[] {
  if (!isPlausibleSecretInput(input)) return [];
  return parseCandidate(input) ?? [];
}

export function isKubernetesSecretInput(input: string): boolean {
  if (!isPlausibleSecretInput(input)) return false;
  // Synchronous privacy checks run before telemetry and on every edit. Treat
  // a large or unfinished candidate as private until it can be classified.
  if (input.length > MAX_PRIVATE_PARSE_LENGTH) return true;
  const resources = parseCandidate(input);
  return resources === null || resources.length > 0;
}
