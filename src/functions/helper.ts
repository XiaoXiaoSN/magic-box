export function isNumeric(num: unknown): boolean {
  if (typeof num === 'number') {
    return true;
  }
  if (typeof num === 'string' && num.trim() !== '' && /^[+-]?\d+(\.\d*)?$/.test(num)) {
    return !Number.isNaN(num)
    && !Number.isNaN(parseFloat(num));
  }

  return false;
}

export function toNumeric(num: unknown): number | null {
  if (isNumeric(num)) {
    return parseFloat(num as string);
  }
  return null;
}

export function isString(variable: unknown): boolean {
  return typeof variable === 'string' || variable instanceof String;
}

export function isArray(variable: unknown): boolean {
  return Array.isArray(variable);
}

export function isObject(variable: unknown): boolean {
  return typeof variable === 'object' && variable !== null;
}

export function trim(str: string): string {
  return str.replace(/^\s+|\s+$/g, '');
}

export function isRFC3339(str: unknown): boolean {
  if (!isString(str)) {
    return false;
  }

  const re = /^(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])[\sT]([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([+|-]([01]\d|2[0-3])):[0-5]\d)$/gm;
  return !!(str as string).match(re);
}

export function isBase64(str: string): boolean {
  // https://stackoverflow.com/a/7874175/6695274
  /*
   *   ^                          # Start of input
   *   ([0-9a-zA-Z+/]{4})*        # Groups of 4 valid characters decode
   *                              # to 24 bits of data for each group
   *   (                          # Either ending with:
   *       ([0-9a-zA-Z+/]{2}==)   # two valid characters followed by ==
   *       |                      # , or
   *       ([0-9a-zA-Z+/]{3}=)    # three valid characters followed by =
   *   )?                         # , or nothing
   *   $                          # End of input
  */
  const re = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/m;
  if (str === '' || str.trim() === '') {
    return false;
  }
  return !!(re.exec(str));
}

export function isJSON(str: string): boolean {
  // https://stackoverflow.com/a/3710506/6695274
  if (/^[\],:{}\s]*$/.test(str.replace(/\\["\\/bfnrtu]/g, '@')
    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, ']')
    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
    return true;
  }
  return false;
}

export const helper = {
  isNumeric,
  toNumeric,
  isString,
  isArray,
  isObject,
  trim,
  isRFC3339,
  isBase64,
  isJSON,
};
