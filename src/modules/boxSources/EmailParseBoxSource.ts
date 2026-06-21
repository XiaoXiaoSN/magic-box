import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 1000;

// /^[^\s@]+$/ and /^[^\s@]+\.[^\s@]+$/ are linear — no nested quantifiers
const LOCAL_RE = /^[^\s@]+$/;
const DOMAIN_RE = /^[^\s@]+\.[^\s@]+$/;

interface ParsedEmail {
  local: string;
  domain: string;
  tld: string;
  baseLocal: string;
  tag: string | null;
  valid: boolean;
}

function parseEmail(raw: string): ParsedEmail {
  const at = raw.lastIndexOf('@');

  if (at <= 0 || at === raw.length - 1) {
    return {
      local: raw,
      domain: '',
      tld: '',
      baseLocal: raw,
      tag: null,
      valid: false,
    };
  }

  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const valid = LOCAL_RE.test(local) && DOMAIN_RE.test(domain);

  const dotIdx = domain.lastIndexOf('.');
  const tld = dotIdx !== -1 ? domain.slice(dotIdx + 1) : domain;

  const plusIdx = local.indexOf('+');
  const baseLocal = plusIdx !== -1 ? local.slice(0, plusIdx) : local;
  const tag = plusIdx !== -1 ? local.slice(plusIdx + 1) : null;

  return { local, domain, tld, baseLocal, tag, valid };
}

export const EmailParseBoxSource = {
  name: 'Email Parse',
  description:
    'Parse an email address into local part, domain, and TLD, with a basic validity check.',
  defaultInput: 'john.doe+news@mail.example.co.uk ::emailparse',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'emailparse', 'email')) return [];
    if (input.length > MAX_INPUT) return [];

    const raw = trim(input);
    const parsed = parseEmail(raw);

    const kv: Record<string, string> = {
      Local: parsed.local || raw,
      Domain: parsed.domain,
      TLD: parsed.tld,
      Valid: String(parsed.valid),
    };

    if (parsed.tag !== null) {
      kv.Base = parsed.baseLocal;
      kv.Tag = parsed.tag;
    }

    // plaintext k:v lines mirror the key-value pairs for copy/headless use
    const plaintext = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Email Parse', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EmailParseBoxSource;
