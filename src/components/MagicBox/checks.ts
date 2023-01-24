import {
  CodeBox, QRCodeBox, ShortenURLBox,
} from '@components/Boxes';
import Base64 from '@functions/base64';
import {
  isBase64,
  isJSON,
  isNumeric,
  isObject,
  isRFC3339,
  isString,
  trim,
} from '@functions/helper';
import { BoxSource, Options } from '@modules/box';
import jwt_decode from 'jwt-decode';
import { evaluate } from 'mathjs';

/*
 * Define box priorities
 */
const PriorityRFC3339 = 9;
const PriorityURLEncode = 10;

export type CheckFunction = (input: string, options: Options | null) => BoxSource[];

// ************************************************************
// *  Start to Define MagicBox Functions
// ************************************************************

const checkCommand = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  const regularInput = trim(input).toLowerCase();

  switch (regularInput) {
    case 'now': {
      const ts = Date.now();
      const tzOffset = (8 * 60 * 60) * 1000;
      const twDate = new Date(ts + tzOffset);
      return [
        {
          name: 'RFC 3339 (UTC+8)',
          stdout: twDate.toISOString().replace('Z', '+08:00'),
          priority: PriorityRFC3339,
        },
        {
          name: 'timestamp (s)',
          stdout: (ts / 1000).toString(),
        },
      ];
    }

    default: {
      // TODO: add random command
      const randomRegex = /^random(\d*)$/i;
      const found = input.match(randomRegex);
      if (found && found.length > 0) {
        const len = 8;
      }

      return [];
    }
  }
};

const checkTimestamp = (input: string): BoxSource[] => {
  if (!isNumeric(input)) {
    return [];
  }

  try {
    let date = new Date(parseFloat(input) * 1000);
    const tzOffset = (8 * 60 * 60) * 1000;
    let twDate = new Date(parseFloat(input) * 1000 + tzOffset);

    // check max and min timestamp
    const minTimestamp = new Date(1600, 1, 1, 0, 0, 0, 0);
    const maxTimestamp = new Date(2050, 12, 31, 23, 59, 59, 0);
    if (date < minTimestamp) {
      return [];
    } if (date > maxTimestamp) {
      // guess the big number is a timestamp in ms, convert ms to sec
      date = new Date(parseFloat(input));
      twDate = new Date(parseFloat(input) + tzOffset);
      if (date > maxTimestamp || date < minTimestamp) {
        return [];
      }
    }

    const resp = [];
    if (date.getTime() > 0) {
      resp.push({
        name: 'RFC 3339',
        stdout: date.toISOString(),
      });
    }
    if (twDate.getTime() > 0) {
      resp.push({
        name: 'RFC 3339 (UTC+8)',
        stdout: twDate.toISOString().replace('Z', '+08:00'),
        priority: PriorityRFC3339,
      });
    }
    return resp;
  } catch { /* */ }

  return [];
};

const checkTimeFormat = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  const regularInput = trim(input);

  if (!isRFC3339(regularInput)) {
    return [];
  }

  try {
    const ts = Date.parse(regularInput);
    if (ts > 0) {
      return [
        {
          name: 'timestamp (s)',
          stdout: (ts / 1000).toString(),
        },
        {
          name: 'timestamp (ms)',
          stdout: ts.toString(),
        },
      ];
    }
  } catch { /* */ }

  return [];
};

const checkJWT = (input: string): BoxSource[] => {
  const regularInput = trim(input);

  try {
    const jwtHeader = jwt_decode(regularInput, { header: true });
    const jwtBody = jwt_decode(regularInput);
    const jwtStr = JSON.stringify({ header: jwtHeader, body: jwtBody }, null, '    ');

    return [{
      name: 'JWT Decode',
      stdout: jwtStr,
      component: CodeBox,
      options: { language: 'json' },
    }];
  } catch { /* */ }

  return [];
};

const checkMathExpressions = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  if (input === '' || trim(input) === '') {
    return [];
  }

  const regularInput = trim(input);

  try {
    let ans = evaluate(regularInput);
    if (ans === null || typeof (ans) === 'object' || typeof (ans) === 'function') {
      return [];
    }

    if (typeof (ans) === 'boolean') {
      ans = ans.toString();
    }

    return [{
      name: 'Math Expressions',
      stdout: ans,
    }];
  } catch { /* */ }

  return [];
};

const checkBase64 = (input: string, options: Options | null): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  const regularInput = trim(input);

  if (!isBase64(regularInput)) {
    return [];
  }

  try {
    const decodeText = Base64.decode(regularInput);

    const languageOpts: Options = {};
    if (options && isObject(options)) {
      try {
        const langKeys = ['language', 'lang', 'l'];

        Object.keys(options).some((option) => langKeys.some((langKey) => {
          if (option.indexOf(`${langKey}=`) === 0) {
            languageOpts.language = option.substring(0, (`${langKey}=`).length);
            return true;
          }
          return false;
        }));
      } catch (e) { console.error('checkBase64 optionTaking failed', e); }
    }

    return [{
      name: 'Base64 decode',
      stdout: decodeText,
      component: CodeBox,
      options: languageOpts,
    }];
  } catch { /* */ }

  return [];
};

const checkCanBeBase64 = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  if (input === '' || trim(input) === '') {
    return [];
  }

  try {
    return [{
      name: 'Base64 encode',
      stdout: Base64.encode(input),
    }];
  } catch { /* */ }

  return [];
};

const checkURLDecode = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  const regularInput = trim(input);

  try {
    const decodeText = decodeURIComponent(regularInput);
    if (decodeText === regularInput) {
      return [];
    }

    return [{
      name: 'URLEncode decode',
      stdout: decodeText,
      priority: PriorityURLEncode,
    }];
  } catch (e) {
    console.error('checkURLDecode', e);
  }

  return [];
};

const checkNeedPrettyJSON = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  if (input === '' || trim(input) === '') {
    return [];
  }
  if (!isJSON(input)) {
    return [];
  }

  try {
    const jsonStr = JSON.stringify(JSON.parse(input), null, '    ');
    if (jsonStr === null) {
      return [];
    }
    if (jsonStr === input) {
      return [];
    }

    return [{
      name: 'Pretty JSON',
      stdout: jsonStr,
      component: CodeBox,
      options: { language: 'json' },
    }];
  } catch { /* */ }

  return [];
};

const takeQRCode = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  if (input === '' || trim(input) === '') {
    return [];
  }

  try {
    return [{
      name: 'QRCode',
      stdout: input,
      component: QRCodeBox,
    }];
  } catch { /* */ }

  return [];
};

const takeShortenURL = (input: string): BoxSource[] => {
  if (!isString(input)) {
    return [];
  }
  if (input === '' || trim(input) === '') {
    return [];
  }

  try {
    return [{
      name: 'Shorten URL',
      stdout: input,
      component: ShortenURLBox,
    }];
  } catch { /* */ }

  return [];
};

// ************************************************************
// *  Start to prepare MagicBox Functions
// ************************************************************

export const inputParser = (input: string): [string, Options] => {
  const regex = /\n::([\w=]+)/gm;
  const matches = Array.from(input.matchAll(regex), (m) => m[1]);

  const initOptions: Record<string, any> = {};
  const options = matches
    .reduce((opts, m) => {
      const updatedOpts = opts;
      updatedOpts[m.toLowerCase()] = true;
      return updatedOpts;
    }, initOptions);

  const replacedInput = input.replaceAll(regex, '');

  return [replacedInput, options];
};

const isOptionKeys = (options: Options, ...keys: string[]) => {
  const regularKeys = keys.map((k) => k.toLowerCase());

  return regularKeys.some((key) => options[key] === true);
};

export const funcPreparer = (defaultFuncs: CheckFunction[], options:Options): CheckFunction[] => {
  const funcs = [];

  if (isOptionKeys(options, 'qrcode', 'qr')) {
    funcs.push(takeQRCode);
  }
  if (isOptionKeys(options, 'surl', 'shorten')) {
    funcs.push(takeShortenURL);
  }

  funcs.push(...defaultFuncs);

  return funcs;
};

export const defaultFuncs: CheckFunction[] = [
  checkCommand,
  checkTimestamp,
  checkTimeFormat,
  checkJWT,
  checkMathExpressions,
  checkBase64,
  checkCanBeBase64,
  checkURLDecode,
  checkNeedPrettyJSON,
];

export default {
  checkCommand,
  checkTimestamp,
  checkTimeFormat,
  checkJWT,
  checkMathExpressions,
  checkBase64,
  checkCanBeBase64,
  checkURLDecode,
  checkNeedPrettyJSON,
  takeQRCode,
  takeShortenURL,
  inputParser,
  funcPreparer,
  defaultFuncs,
};
