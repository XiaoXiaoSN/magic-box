export function isNumeric(num: unknown): boolean {
  if (typeof num === 'number') {
    return true;
  }
  if (
    typeof num === 'string' &&
    num.trim() !== '' &&
    /^[+-]?\d+(\.\d*)?$/.test(num)
  ) {
    return !Number.isNaN(num) && !Number.isNaN(parseFloat(num));
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

  const re =
    /^(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])[\sT]([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([+|-]([01]\d|2[0-3])):[0-5]\d)$/i;
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
  const re = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  if (str === '' || str.trim() === '') {
    return false;
  }
  return !!re.exec(str);
}

export function isJSON(str: string): boolean {
  // https://stackoverflow.com/a/3710506/6695274
  if (
    /^[\],:{}\s]*$/.test(
      str
        .replace(/\\["\\/bfnrtu]/g, '@')
        .replace(
          /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
          ']',
        )
        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''),
    )
  ) {
    return true;
  }
  return false;
}

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isValidDay(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > DAYS_IN_MONTH[month]) return false;
  return true;
}

export function parseDateString(
  input: string,
): { year?: number; month: number; day: number } | null {
  const cleaned = trim(input);
  if (!cleaned) return null;

  // 1. Check numeric timestamp
  // A UNIX timestamp in seconds/ms is an integer and usually has 8 to 13 digits
  if (/^\d{8,13}$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    const date = new Date(num >= 1e11 ? num : num * 1000);
    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      if (isValidDay(month, day)) {
        return { year, month, day };
      }
    }
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD or YYYY年MM月DD日
  const ymdRegex =
    /^\s*(\d{4})[-/.\s年]+(\d{1,2})[-/.\s月]+(\d{1,2})(?:日|號)?(?:\s|$|T)/i;
  const ymdMatch = ymdRegex.exec(cleaned);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (isValidDay(month, day)) {
      return { year, month, day };
    }
    return null;
  }

  // 3. MM-DD-YYYY or DD-MM-YYYY
  const mdyRegex = /^\s*(\d{1,2})[-/.\s]+(\d{1,2})[-/.\s]+(\d{2,4})(?:\s|$|T)/i;
  const mdyMatch = mdyRegex.exec(cleaned);
  if (mdyMatch) {
    let month = parseInt(mdyMatch[1], 10);
    let day = parseInt(mdyMatch[2], 10);
    const yearRaw = parseInt(mdyMatch[3], 10);
    if (month > 12 && day <= 12) {
      const temp = month;
      month = day;
      day = temp;
    }
    const year =
      yearRaw < 100
        ? yearRaw > 50
          ? 1900 + yearRaw
          : 2000 + yearRaw
        : yearRaw;
    if (isValidDay(month, day)) {
      return { year, month, day };
    }
    return null;
  }

  // 4. Month Name patterns
  const MONTH_MAP: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  const monthNamesPattern =
    '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

  // June 25, 2026
  const mNameDayYear = new RegExp(
    `^\\s*${monthNamesPattern}[-/.,\\s]+(\\d{1,2})(?:[-/.,\\s]+(\\d{2,4}))?`,
    'i',
  );
  const mndyMatch = mNameDayYear.exec(cleaned);
  if (mndyMatch) {
    const monthName = mndyMatch[1].toLowerCase();
    const month = MONTH_MAP[monthName];
    const day = parseInt(mndyMatch[2], 10);
    if (month && isValidDay(month, day)) {
      if (mndyMatch[3]) {
        const yearRaw = parseInt(mndyMatch[3], 10);
        const year =
          yearRaw < 100
            ? yearRaw > 50
              ? 1900 + yearRaw
              : 2000 + yearRaw
            : yearRaw;
        return { year, month, day };
      }
      return { month, day };
    }
    return null;
  }

  // 25 June 2026
  const dayMNameYear = new RegExp(
    `^\\s*(\\d{1,2})(?:st|n[d]|rd|th)?[-/.,\\s]+(?:of\\s+)?${monthNamesPattern}(?:[-/.,\\s]+(\\d{2,4}))?`,
    'i',
  );
  const dmnyMatch = dayMNameYear.exec(cleaned);
  if (dmnyMatch) {
    const day = parseInt(dmnyMatch[1], 10);
    const monthName = dmnyMatch[2].toLowerCase();
    const month = MONTH_MAP[monthName];
    if (month && isValidDay(month, day)) {
      if (dmnyMatch[3]) {
        const yearRaw = parseInt(dmnyMatch[3], 10);
        const year =
          yearRaw < 100
            ? yearRaw > 50
              ? 1900 + yearRaw
              : 2000 + yearRaw
            : yearRaw;
        return { year, month, day };
      }
      return { month, day };
    }
    return null;
  }

  // 5. MM-DD or MM/DD or MM.DD or MM月DD日
  const mdRegex = /^\s*(\d{1,2})[-/.\s月]+(\d{1,2})(?:日|號)?\s*$/i;
  const mdMatch = mdRegex.exec(cleaned);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    if (isValidDay(month, day)) {
      return { month, day };
    }
    return null;
  }

  // 6. General JS Date parsing fallback (only if it doesn't look like an invalid date string with slashes/dashes)
  if (!/[\d-]/.test(cleaned) || !Number.isNaN(Date.parse(cleaned))) {
    const fallbackDate = new Date(cleaned);
    if (!Number.isNaN(fallbackDate.getTime())) {
      const year = fallbackDate.getFullYear();
      const month = fallbackDate.getMonth() + 1;
      const day = fallbackDate.getDate();
      if (isValidDay(month, day)) {
        return { year, month, day };
      }
    }
  }

  return null;
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
  isValidDay,
  parseDateString,
};
