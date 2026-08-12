import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// official semver 2.0.0 regex from https://semver.org/#is-there-a-suggested-regexp-to-check-a-semver-string
const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

interface SemverMatch {
  major: string;
  minor: string;
  patch: string;
  prerelease: string | null;
  build: string | null;
}

function parseSemver(raw: string): SemverMatch | null {
  // strip optional leading 'v' before matching
  const normalized = raw.startsWith('v') ? raw.slice(1) : raw;
  const m = SEMVER_REGEX.exec(normalized);
  if (!m) return null;

  return {
    major: m[1],
    minor: m[2],
    patch: m[3],
    prerelease: m[4] ?? null,
    build: m[5] ?? null,
  };
}

export const SemverBoxSource = {
  defaultDisabled: true,
  name: 'Semver',
  description:
    'Parse and validate a Semantic Version string into its components.',
  defaultInput: '1.2.3-beta.1+build.5 ::semver',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'semver')) return [];

    const raw = trim(input);
    const parsed = parseSemver(raw);

    if (!parsed) {
      const content = `"${raw}" is not a valid semver string`;
      return [
        new BoxBuilder('Semver', content)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Valid: 'false', Input: raw })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const kvOptions: Record<string, string> = {
      Major: parsed.major,
      Minor: parsed.minor,
      Patch: parsed.patch,
    };

    // omit Prerelease / Build keys entirely when absent (consistent handling)
    if (parsed.prerelease !== null) {
      kvOptions.Prerelease = parsed.prerelease;
    }
    if (parsed.build !== null) {
      kvOptions.Build = parsed.build;
    }
    kvOptions.Valid = 'true';

    const lines = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Semver', lines)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SemverBoxSource;
