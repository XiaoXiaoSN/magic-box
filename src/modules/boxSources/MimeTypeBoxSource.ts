import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// extension (no dot, lowercase) -> mime type
const EXT_TO_MIME: Record<string, string> = {
  // text
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  md: 'text/markdown',
  rtf: 'text/rtf',
  ics: 'text/calendar',
  vcf: 'text/vcard',
  xml: 'text/xml',
  // javascript / json / data
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  jsx: 'text/jsx',
  json: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  toml: 'application/toml',
  sql: 'application/sql',
  // documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  // images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  avif: 'image/avif',
  heic: 'image/heic',
  // audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  // video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  // archives
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  bz2: 'application/x-bzip2',
  // fonts
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  // binaries / executables
  bin: 'application/octet-stream',
  exe: 'application/x-msdownload',
  apk: 'application/vnd.android.package-archive',
  deb: 'application/vnd.debian.binary-package',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
  wasm: 'application/wasm',
  // scripts / source
  sh: 'application/x-sh',
  py: 'text/x-python',
  rb: 'application/x-ruby',
  go: 'text/x-go',
  rs: 'text/x-rust',
  c: 'text/x-c',
  cpp: 'text/x-c++',
  java: 'text/x-java-source',
  php: 'application/x-httpd-php',
};

// build reverse map once at module load
const MIME_TO_EXTS: Map<string, string[]> = new Map();
for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
  const existing = MIME_TO_EXTS.get(mime);
  if (existing) {
    existing.push(ext);
  } else {
    MIME_TO_EXTS.set(mime, [ext]);
  }
}

// extract the extension from a raw input string (filename, path, or bare extension)
function extractExtension(raw: string): string {
  const base = raw.includes('.') ? raw.slice(raw.lastIndexOf('.') + 1) : raw;
  return base.toLowerCase();
}

// derive the broad category from a mime type string (e.g. 'image' from 'image/png')
function mimeCategory(mime: string): string {
  return mime.split('/')[0] ?? 'unknown';
}

export const MimeTypeBoxSource = {
  name: 'MIME Type',
  description:
    'Look up the MIME type for a file extension, or extensions for a MIME type.',
  defaultInput: 'png ::mimetype',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mimetype', 'mime')) return [];

    const normalized = trim(input);
    if (!normalized) return [];

    // if input contains '/' treat it as a mime type -> reverse lookup
    if (normalized.includes('/')) {
      const mime = normalized.toLowerCase();
      const exts = MIME_TO_EXTS.get(mime);
      const extensionsValue = exts ? exts.join(', ') : 'none known';

      const kv: Record<string, string> = {
        'MIME Type': mime,
        Extensions: extensionsValue,
      };
      const plaintext = `MIME Type: ${mime}\nExtensions: ${extensionsValue}`;

      return [
        new BoxBuilder('MIME Type', plaintext)
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // forward lookup: extension -> mime type
    const ext = extractExtension(normalized);
    const mime = EXT_TO_MIME[ext];

    if (!mime) {
      const kv: Record<string, string> = {
        Extension: ext,
        'MIME Type': 'unknown',
        Category: 'unknown',
      };
      const plaintext = `Extension: ${ext}\nMIME Type: unknown\nCategory: unknown`;

      return [
        new BoxBuilder('MIME Type', plaintext)
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const kv: Record<string, string> = {
      Extension: ext,
      'MIME Type': mime,
      Category: mimeCategory(mime),
    };
    const plaintext = `Extension: ${ext}\nMIME Type: ${mime}\nCategory: ${mimeCategory(mime)}`;

    return [
      new BoxBuilder('MIME Type', plaintext)
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MimeTypeBoxSource;
