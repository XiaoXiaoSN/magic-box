import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maps file extension to MIME type
const EXT_TO_MIME: Record<string, string> = {
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wasm: 'application/wasm',
};

// inverted index: mime type -> list of extensions
const MIME_TO_EXTS: Record<string, string[]> = {};
for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
  if (!MIME_TO_EXTS[mime]) {
    MIME_TO_EXTS[mime] = [];
  }
  MIME_TO_EXTS[mime].push(ext);
}

export const MimeTypeBoxSource = {
  name: 'MIME Type',
  description:
    'Look up the MIME type for a file extension, or extensions for a MIME type.',
  defaultInput: 'png ::mime',
  tag: '#',
  kind: 'Reference',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mime', 'mimetype')) return [];

    const s = trim(input).toLowerCase().replace(/^\./, '');
    if (!s) return [];

    // if input contains '/', treat it as a MIME type lookup
    if (s.includes('/')) {
      const exts = MIME_TO_EXTS[s];
      if (!exts || exts.length === 0) {
        return [
          new BoxBuilder('MIME Type', '')
            .setOptions({
              'MIME Type': s,
              Extensions: 'No matching extensions found',
            })
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
      return [
        new BoxBuilder('MIME Type', '')
          .setOptions({ 'MIME Type': s, Extensions: exts.join(', ') })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // treat input as a file extension
    const mime = EXT_TO_MIME[s];
    if (!mime) {
      return [
        new BoxBuilder('MIME Type', '')
          .setOptions({ Extension: s, 'MIME Type': 'Unknown extension' })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }
    return [
      new BoxBuilder('MIME Type', '')
        .setOptions({ Extension: s, 'MIME Type': mime })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MimeTypeBoxSource;
