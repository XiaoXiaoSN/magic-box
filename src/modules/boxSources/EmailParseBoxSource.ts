import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// RFC 5321 caps email addresses at 320 characters
const MAX_EMAIL_LENGTH = 320;

// simple linear regex: no whitespace, exactly one @, at least one dot in the domain
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailParseBoxSource = {
  name: 'Email Parse',
  description:
    'Validate an email address and split it into local part, domain, and tags.',
  defaultInput: 'john.doe+news@mail.example.co.uk ::email',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'email')) return [];

    const s = trim(input);

    if (s.length > MAX_EMAIL_LENGTH || !emailPattern.test(s)) {
      return [
        new BoxBuilder('Email Parse', `"${s}" is not a valid email address.`)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // split on the last '@' to handle edge cases where local part could theoretically include it
    const atIndex = s.lastIndexOf('@');
    const local = s.slice(0, atIndex);
    const domain = s.slice(atIndex + 1);

    // extract +tag sub-address from local part (everything after the first '+')
    const plusIndex = local.indexOf('+');
    // only treat it as a tag when there's something after the '+'
    const tag =
      plusIndex !== -1 && plusIndex < local.length - 1
        ? local.slice(plusIndex + 1)
        : null;

    // TLD is the last dot-segment of the domain
    const tld = domain.slice(domain.lastIndexOf('.') + 1);

    const output: Record<string, string> = {
      Local: local,
      Domain: domain,
      TLD: tld,
    };

    if (tag !== null) {
      output.Tag = tag;
    }

    const plaintextOutput = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Email Parse', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EmailParseBoxSource;
