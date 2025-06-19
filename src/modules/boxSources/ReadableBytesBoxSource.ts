import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityReadableBytes = 10;

interface Match {
  decodedText: string;
}

export const ReadableBytesBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    let content = trim(input);
    if (!content) {
      return undefined;
    }

    // Remove brackets or Go-style []byte{}
    if (/^\[.*\]$/.test(content)) {
      content = content.replace(/^\[|\]$/g, '');
    } else if (/^\[\]byte\{.*\}$/.test(content)) {
      content = content.replace(/^\[\]byte\{|\}$/g, '');
    }

    // Remove commas if present
    content = content.replace(/,/g, ' ');

    // Split by whitespace
    const parts = content.split(/\s+/).filter((p) => Boolean(p));
    if (parts.length === 0) return undefined;

    // Detect if any part is hex (0x or contains a-f)
    let isHex = false;
    if (parts.some((p) => /^0x/i.test(p))) {
      isHex = true;
    } else if (parts.some((p) => /[a-fA-F]/.test(p))) {
      isHex = true;
    }

    // Parse bytes
    const bytes: number[] = [];
    let invalid = false;
    parts.forEach((part) => {
      let value: number | undefined;
      if (/^0x[0-9a-fA-F]+$/.test(part)) {
        value = parseInt(part, 16);
      } else if (isHex) {
        value = parseInt(part, 16);
      } else if (/^\d+$/.test(part)) {
        value = parseInt(part, 10);
      } else {
        invalid = true;
        return;
      }
      if (value < 0 || value > 255 || Number.isNaN(value)) {
        invalid = true;
        return;
      }
      bytes.push(value);
    });
    if (invalid) return undefined;

    // Convert to string (ASCII/UTF-8)
    try {
      let decodedText: string;
      if (typeof TextDecoder !== 'undefined') {
        decodedText = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
      } else {
        decodedText = String.fromCharCode(...bytes);
      }
      return { decodedText };
    } catch {
      return undefined;
    }
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }
    const { decodedText } = match;
    return [
      new BoxBuilder('ByteArray to String', decodedText)
        .setPriority(PriorityReadableBytes)
        .setTemplate(DefaultBoxTemplate)
        .build(),
    ];
  },
};

export default ReadableBytesBoxSource;
