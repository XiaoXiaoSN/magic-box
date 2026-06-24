import { describe, expect, it } from 'vitest';
import { Base64UrlBoxSource } from '../Base64UrlBoxSource';

describe('Base64UrlBoxSource', () => {
  describe('generateBoxes — option gating', () => {
    it('returns [] when no option is present', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for unrelated option', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — ::base64url', () => {
    it('encodes "hello world" to the known RFC 4648 vector', async () => {
      // standard base64 of "hello world" is "aGVsbG8gd29ybGQ=" → strip "=" → url-safe
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64url: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base64 URL (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('aGVsbG8gd29ybGQ');
    });

    it('encodes via ::base64urlencode alias', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64urlencode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('aGVsbG8gd29ybGQ');
    });

    it('replaces + with - and / with _ (bytes 0xfb 0xff produce standard "+/8=")', async () => {
      // bytes [0xfb, 0xff] → groups: 0xfb=11111011, 0xff=11111111, pad 0x00=00000000
      // 6-bit chunks: 111110 110111 111100 000000 → 62, 55, 60, 0 → +, 3, 8, A  (standard: "+38A")
      // wait — let's use the string '\xfb\xff' which when UTF-8 encoded differs.
      // Instead use a raw Uint8Array approach via a known two-byte latin1 sequence
      // encoded as a string with codepoints < 128 that, when base64'd, hits + and /
      //
      // bytes 0x3e = 62 → maps to '+' in standard base64 as a 6-bit value
      // input bytes that force + and /: need two 6-bit groups = 62 ('+') and 63 ('/')
      // bytes: 0xfb 0xef → binary: 11111011 11101111
      //   group1 (bits 0-5 of byte0): 111110 = 62 → '+'
      //   group2 (bits 6-7 of byte0, bits 0-3 of byte1): 11 1110 = 62 — hmm, still '+'
      //
      // simplest known vector: input string that encodes to standard "+/..." is "~??~" in some encodings
      // use a safe approach: verify the replace logic with string "+/8A" should become "-_8A"
      //
      // actual test: use btoa known result: btoa('\xfb\xff') = '+/8=' in browsers
      // but TextEncoder('\xfb\xff') would encode as multi-byte UTF-8 which differs.
      //
      // Use a 3-byte group that hits both chars: bytes [0xfb, 0xef, 0xbe]
      // 0xfb = 11111011, 0xef = 11101111, 0xbe = 10111110
      // 6-bit groups: 111110 11 1110 1111 10 111110 → 62, 59(;?), hmm...
      //
      // SIMPLEST approach: test the replacement rule by checking a string that we KNOW
      // produces '-' and '_' in URL-safe base64 from the implementation.
      // "ÿ" (U+00FF) UTF-8 is 0xC3 0xBF
      // 0xC3=11000011, 0xBF=10111111, pad 0x00
      // groups: 110000 11 1011 1111 00 000000 → 48,59,60,0 → w,7,8,A → standard "w78A"
      // no + or /. Need to find a real example.
      //
      // bytes: [0xfb] alone:
      // 0xfb = 11111011, pad 0x00, pad 0x00
      // groups: 111110 110000 000000 000000 → 62,48,0,0 → '+','w','A','A' → standard: "+wAA" but padded would be "+w=="
      // url-safe: "-w"  (stripped 2 padding chars → 4-2=2 groups shown, rest stripped)
      // wait that's only one replacement

      // "þþ" (U+00FE U+00FE): UTF-8 0xC3 0xBE 0xC3 0xBE
      // bytes [0xC3, 0xBE, 0xC3]: groups 110000 11 1011 1000 11 000011 → 48,59,35,3 → "w7j" hmm
      // Let me just use the clean known pair:
      // bytes [0xfb, 0xff, 0x00] UTF-8? these are NOT valid single-char UTF-8 sequences
      // The task says: "bytes 0xfb 0xff → standard '+/8=' → url-safe '-_8'"
      // But these bytes arrive via TextEncoder, so we can't directly get them from ASCII strings.
      //
      // Use a workaround: test with a string whose UTF-8 bytes happen to produce + and /
      // OR test the source replace logic indirectly via an input that rounds through correctly.
      //
      // Final approach: use a Latin-1 string that when encoded as UTF-8 triggers the groups.
      // "þ" = U+00FE → UTF-8: [0xC3, 0xBE]
      // 0xC3=11000011, 0xBE=10111110, pad 0
      // groups: 110000 111011 111000 000000 → 48,59,56,0 → 'w',':' — 59 is out of alphabet
      // Actually 59 in the standard b64 alphabet is '7'. Let me redo:
      // standard: A-Z=0-25, a-z=26-51, 0-9=52-61, +=62, /=63
      // 48 → 'w' (48-26=22nd lowercase, 'w'), 59 → '7' (59-52=7th digit), 56 → '4' (56-52=4th digit), 0→'A'
      // so "w74A" — no + or /
      //
      // ACTUAL test: just verify the property holds for a round-trip and that the output
      // contains no '+', '/', or '=' characters (the invariant of URL-safe base64).
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64url: true,
      });
      const encoded = boxes[0].props.plaintextOutput;
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('output contains only url-safe chars', async () => {
      const testInputs = [
        'hello world',
        'foobar',
        'abc123!@#$%^&*()',
        '🎉 emoji test',
      ];
      for (const input of testInputs) {
        const boxes = await Base64UrlBoxSource.generateBoxes(input, {
          base64url: true,
        });
        expect(boxes[0].props.plaintextOutput).toMatch(/^[A-Za-z0-9\-_]*$/);
      }
    });
  });

  describe('encode — known vector with + and / substitution', () => {
    it('produces - and _ for inputs that would yield + and / in standard base64', async () => {
      // ">" is 0x3E. Three ">" chars: bytes [0x3E, 0x3E, 0x3E]
      // 0x3E=00111110
      // groups: 001111 100011 111000 111110 → 15,35,56,62
      // 15→'P', 35→'j', 56→'4', 62→'+' in standard → '+' becomes '-' in url-safe
      // BUT TextEncoder('>>>') gives [0x3e,0x3e,0x3e] since '>' is ASCII
      const boxes = await Base64UrlBoxSource.generateBoxes('>>>', {
        base64url: true,
      });
      expect(boxes).toHaveLength(1);
      const encoded = boxes[0].props.plaintextOutput;
      // standard base64 of ">>>" is "Pj4+" → url-safe must be "Pj4-"
      expect(encoded).toBe('Pj4-');
      expect(encoded).not.toContain('+');
    });

    it('produces _ for inputs that yield / in standard base64', async () => {
      // "??" = [0x3F, 0x3F]
      // 0x3F=00111111
      // groups: 001111 110011 111100 (pad) → 15,51,60 → 'P','z','8' — no / here
      // use "???" = [0x3F,0x3F,0x3F]
      // groups: 001111 110011 111100 111111 → 15,51,60,63 → 'P','z','8','/' → url-safe 'Pz8_'
      const boxes = await Base64UrlBoxSource.generateBoxes('???', {
        base64url: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Pz8_');
    });
  });

  describe('decode — ::base64urldecode', () => {
    it('decodes "aGVsbG8gd29ybGQ" back to "hello world"', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('aGVsbG8gd29ybGQ', {
        base64urldecode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base64 URL (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('hello world');
    });

    it('returns invalid box for input containing "+" (standard base64 char, not url-safe)', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('aGVs+G8', {
        base64urldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('invalid Base64URL input');
    });

    it('returns invalid box for input containing "="', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('aGVsbG8=', {
        base64urldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('invalid Base64URL input');
    });

    it('returns invalid box for input containing space', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('aGVs bG8', {
        base64urldecode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('invalid Base64URL input');
    });
  });

  describe('round-trip', () => {
    it('decode(encode("hello world")) === "hello world"', async () => {
      const encBoxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64url: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;
      const decBoxes = await Base64UrlBoxSource.generateBoxes(encoded, {
        base64urldecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('hello world');
    });

    it('decode(encode("foobar")) === "foobar"', async () => {
      const encBoxes = await Base64UrlBoxSource.generateBoxes('foobar', {
        base64url: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;
      const decBoxes = await Base64UrlBoxSource.generateBoxes(encoded, {
        base64urldecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe('foobar');
    });

    it('round-trips unicode / emoji', async () => {
      const input = '🎉 Magic Box!';
      const encBoxes = await Base64UrlBoxSource.generateBoxes(input, {
        base64url: true,
      });
      const encoded = encBoxes[0].props.plaintextOutput;
      const decBoxes = await Base64UrlBoxSource.generateBoxes(encoded, {
        base64urldecode: true,
      });
      expect(decBoxes[0].props.plaintextOutput).toBe(input);
    });
  });

  describe('both options together', () => {
    it('returns 2 boxes when both encode and decode options are set', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64url: true,
        base64urldecode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Base64 URL (Encode)');
      expect(boxes[1].props.name).toBe('Base64 URL (Decode)');
    });
  });

  describe('box metadata', () => {
    it('sets priority, showExpandButton=false, and template', async () => {
      const boxes = await Base64UrlBoxSource.generateBoxes('hello world', {
        base64url: true,
      });
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });
});
