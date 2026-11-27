import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { SaxesParser, type SaxesTagNS } from 'saxes';

const ATTRIBUTE_PREFIX = '@_';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
const XML_WHITESPACE = /^[ \t\r\n]*$/;
const XML_INDENT = '    ';
const MAX_DEPTH = 100;

type XmlValue = string | XmlObject;

interface XmlObject {
  [name: string]: XmlValue | XmlValue[];
}

interface Child {
  name: string;
  start: number;
  value: XmlValue;
}

interface ElementFrame {
  tag: SaxesTagNS;
  start: number;
  insertionStart: number;
  children: Child[];
  text: string[];
  hasInlineText: boolean;
  hasOtherMarkup: boolean;
  preserveSpace: boolean;
}

interface Insertion {
  position: number;
  indentation: string;
}

export interface XmlDocument {
  formatted: string;
  data: unknown;
  conversionError?: string;
}

const legacyDtdParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTRIBUTE_PREFIX,
  parseTagValue: false,
  parseAttributeValue: false,
});

export function invalidXmlName(name: string): never {
  throw new Error(`Invalid XML name ${JSON.stringify(name)}. Rename this key.`);
}

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: ATTRIBUTE_PREFIX,
  format: true,
  indentBy: XML_INDENT,
  sanitizeName: invalidXmlName,
};
const xmlBuilder = new XMLBuilder(builderOptions);

export function buildXml(data: object): string {
  const output = xmlBuilder.build(data) as string;
  new SaxesParser({ xmlns: true }).write(output).close();
  return output;
}

function asObjectValue(element: ElementFrame): XmlValue {
  const value: XmlObject = Object.create(null);
  for (const { name, value: attribute } of Object.values(
    element.tag.attributes,
  )) {
    value[ATTRIBUTE_PREFIX + name] = attribute;
  }

  for (const { name, value: child } of element.children) {
    const previous = value[name];
    if (Array.isArray(previous)) previous.push(child);
    else value[name] = previous === undefined ? child : [previous, child];
  }

  if (element.children.length === 0) {
    const text = element.text.join('');
    if (Object.keys(value).length === 0) return text;
    if (text !== '') value['#text'] = text;
  }
  return value;
}

function hasInterleavedChildren(children: Child[]): boolean {
  const names = new Set<string>();
  let previous: string | undefined;
  for (const { name } of children) {
    if (name === previous) continue;
    if (names.has(name)) return true;
    names.add(name);
    previous = name;
  }
  return false;
}

function insertIndentation(source: string, insertions: Insertion[]): string {
  insertions.sort((a, b) => a.position - b.position);
  let previous = 0;
  const parts: string[] = [];
  for (const { position, indentation } of insertions) {
    parts.push(source.slice(previous, position), '\n', indentation);
    previous = position;
  }
  parts.push(source.slice(previous));
  return parts.join('');
}

export function parseXmlDocument(source: string): XmlDocument {
  const parser = new SaxesParser({ xmlns: true });
  const stack: ElementFrame[] = [];
  const insertions: Insertion[] = [];
  let root: Child | undefined;
  let conversionError: string | undefined;
  let hasDoctype = false;
  let hasCustomEntities = false;

  parser.on('doctype', () => {
    hasDoctype = true;
  });
  parser.on('error', (error) => {
    // Saxes does not resolve internal DTD entities. Keep the existing decoder
    // for documents that use them while still checking XML document structure.
    if (hasDoctype && error.message.endsWith(' undefined entity.')) {
      hasCustomEntities = true;
      return;
    }
    throw error;
  });
  parser.on('opentag', (tag) => {
    if (stack.length >= MAX_DEPTH)
      throw new Error('Maximum XML depth exceeded.');
    const parent = stack.at(-1);
    const space = Object.values(tag.attributes).find(
      ({ uri, local }) => uri === XML_NAMESPACE && local === 'space',
    )?.value;
    stack.push({
      tag,
      start: source.lastIndexOf('<', parser.position - 1),
      insertionStart: insertions.length,
      children: [],
      text: [],
      hasInlineText: false,
      hasOtherMarkup: false,
      preserveSpace:
        space === 'preserve' ||
        (space !== 'default' && !!parent?.preserveSpace),
    });
  });
  parser.on('text', (text) => {
    const element = stack.at(-1);
    if (!element) return;
    element.text.push(text);
    // Multiline whitespace is the indentation convention of the object mapping.
    element.hasInlineText ||=
      !XML_WHITESPACE.test(text) || !/[\r\n]/.test(text);
  });
  parser.on('cdata', (text) => {
    const element = stack.at(-1);
    if (!element) return;
    element.text.push(text);
    element.hasInlineText = true;
    element.hasOtherMarkup = true;
  });
  const markOtherMarkup = () => {
    const element = stack.at(-1);
    if (element) element.hasOtherMarkup = true;
  };
  parser.on('comment', markOtherMarkup);
  parser.on('processinginstruction', markOtherMarkup);
  parser.on('closetag', () => {
    const element = stack.pop();
    if (!element) return;
    if (element.children.length) {
      if (
        element.hasInlineText ||
        (element.preserveSpace && element.text.length)
      ) {
        conversionError ??=
          'XML has mixed text and elements. Use XML output to preserve their order.';
      } else if (hasInterleavedChildren(element.children)) {
        conversionError ??=
          'XML has interleaved repeated elements. Use XML output to preserve their order.';
      }
      // Adding indentation anywhere inside a text-bearing element would
      // change its text content, including whitespace between its children.
      if (element.text.length || element.preserveSpace) {
        insertions.length = element.insertionStart;
      } else if (!element.hasOtherMarkup) {
        const indentation = XML_INDENT.repeat(stack.length);
        for (const child of element.children) {
          insertions.push({
            position: child.start,
            indentation: indentation + XML_INDENT,
          });
        }
        insertions.push({
          position: source.lastIndexOf('<', parser.position - 1),
          indentation,
        });
      }
    }
    const closed = {
      name: element.tag.name,
      start: element.start,
      value: asObjectValue(element),
    };
    const parent = stack.at(-1);
    if (parent) parent.children.push(closed);
    else root = closed;
  });
  parser.write(source).close();
  if (!root) throw new Error('XML document has no root element.');

  if (hasCustomEntities) {
    const validation = XMLValidator.validate(source);
    if (validation !== true) throw new Error(validation.err.msg);
    const data: unknown = legacyDtdParser.parse(source);
    return { formatted: source, data, conversionError };
  }

  // A root can follow a declaration, comment or processing instruction.
  if (root.start > 0 && source[root.start - 1] === '>') {
    insertions.push({ position: root.start, indentation: '' });
  }

  return {
    formatted: hasDoctype ? source : insertIndentation(source, insertions),
    data: { [root.name]: root.value },
    conversionError,
  };
}
