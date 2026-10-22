import type { Locale } from './index';

export interface BoxSourceTranslation {
  name: string;
  description: string;
}

export const BOX_SOURCE_IDS = [
  'color',
  'color-contrast',
  'escape-string',
  'base64-decode',
  'cron-expression',
  'data-converter',
  'json-tools',
  'date-calculate',
  'duration',
  'generate-qr-code',
  'hash',
  'jwt-decode',
  'objectid',
  'ksuid',
  'k8s-secret',
  'math-expression',
  'my-ip',
  'now',
  'password-generator',
  'random-integer',
  'readable-bytes',
  'shorten-url',
  'time-format',
  'url-decode',
  'uuid',
  'timestamp',
  'base64-encode',
  'word-wrap',
  'a1z26',
  'ascii-code',
  'aspect-ratio',
  'base32',
  'base58',
  'base62',
  'base85',
  'base91',
  'text-to-binary',
  'bmi',
  'dice-roll',
  'easter',
  'fraction',
  'frequency',
  'gcd-lcm',
  'distance',
  'line-tools',
  'power-convert',
  'semver',
  'snowflake',
  'sort-lines',
  'soundex',
  'speed-convert',
  'subnet',
  'temperature',
  'text-diff',
  'text-reverse',
  'twos-complement',
  'ulid',
  'unicode-normalize',
  'unit-converter',
  'week-number',
  'whitespace-clean',
  'words-to-number',
  'zodiac-sign',
  'word-count',
  'markdown-toc',
  'punycode',
  'radix-convert',
  'query-string',
  'hex-dump',
  'text-to-hex',
  'url-parse',
  'readable-text-color',
  'credit-card-info',
  'glob-to-regex',
  'hsv',
  'ipv6',
  'ieee-754',
  'mac-address',
  'morse-code',
  'port-lookup',
  'unicode-escape',
  'hmac',
  'pbkdf2',
  'local-ai',
  'crc-32',
  'crockford-base32',
  'case-converter',
  'certificate-decode',
  'cheat-sheet',
  'coordinates',
  'html-entities',
  'http-status',
  'chmod-calculator',
] as const;
export type BoxSourceId = (typeof BOX_SOURCE_IDS)[number];

const en: Record<BoxSourceId, BoxSourceTranslation> = {
  color: {
    name: 'Color',
    description:
      'Convert HEX, RGB, and HSL colors; use ::cmyk, ::lighten, ::darken, or ::colormix for more formats and adjustments.',
  },
  'color-contrast': {
    name: 'Color Contrast',
    description:
      'WCAG contrast ratio between two hex colors (space- or newline-separated).',
  },
  'escape-string': {
    name: 'Escape String',
    description:
      'Unescape JSON-escaped strings (\\") and strip ANSI color codes.',
  },
  'base64-decode': {
    name: 'Base64 Decode',
    description: 'Decode a Base64 encoded string back into readable text.',
  },
  'cron-expression': {
    name: 'Cron Expression',
    description: 'Translate cron expressions into human-readable schedules.',
  },
  'data-converter': {
    name: 'Data Converter',
    description: 'Pretty-print and convert between JSON, YAML, TOML and XML.',
  },
  'json-tools': {
    name: 'JSON Tools',
    description:
      'Merge, pick/omit, query (RFC 6901 JSON Pointer) and JSONL-convert JSON. ::jsonmerge (objects separated by a --- line), ::jsonpick=a,b, ::jsonomit=a,b, ::jsonpointer=/a/0, ::tojsonl, ::fromjsonl, ::jsonl (auto).',
  },
  'date-calculate': {
    name: 'Date Calculate',
    description:
      'Add or subtract calendar or time units from a date, or compute the duration between two dates.',
  },
  duration: {
    name: 'Duration',
    description:
      'Convert numeric seconds/milliseconds or human duration formats (e.g. 10s, 8789sec, 1m48s, 1h3s) to/from human durations and clock formats.',
  },
  'generate-qr-code': {
    name: 'Generate QR Code',
    description: 'Turn any input into a scannable QR code.',
  },
  hash: {
    name: 'Hash',
    description:
      'Compute SHA hashes via Web Crypto and MD5 as a legacy checksum.',
  },
  'jwt-decode': {
    name: 'JWT Decode',
    description:
      'Decode a JWT, render NumericDate claims in the preferred timezone, and optionally verify HS256/HS384/HS512 with ::secret.',
  },
  objectid: {
    name: 'ObjectId',
    description:
      'Decode a MongoDB ObjectId timestamp, random value, and counter with ::objectid.',
  },
  ksuid: {
    name: 'KSUID',
    description: 'Decode a KSUID timestamp and 128-bit payload with ::ksuid.',
  },
  'k8s-secret': {
    name: 'K8s Secret',
    description: 'Base64-decode all values inside a Kubernetes Secret YAML.',
  },
  'math-expression': {
    name: 'Math Expression',
    description: 'Evaluate mathematical expressions with standard operators.',
  },
  'my-ip': {
    name: 'My IP',
    description: 'Show your public IP address along with geolocation.',
  },
  now: {
    name: 'Now',
    description:
      'Display the current time in UTC, the preferred timezone, and Unix timestamp.',
  },
  'password-generator': {
    name: 'Password Generator',
    description: 'Generates a secure random password.',
  },
  'random-integer': {
    name: 'Random Integer',
    description: 'Generate a random integer in a range of your choosing.',
  },
  'readable-bytes': {
    name: 'Readable Bytes',
    description: 'Turn a comma-separated byte array into a readable string.',
  },
  'shorten-url': {
    name: 'Shorten URL',
    description: 'Generate a short URL with an optional custom alias.',
  },
  'time-format': {
    name: 'Time Format',
    description:
      'Convert an RFC 3339 timestamp into Unix seconds and milliseconds.',
  },
  'url-decode': {
    name: 'URL Decode',
    description: 'Decode percent-encoded strings.',
  },
  uuid: {
    name: 'UUID',
    description:
      'Generate UUID v4 or v7 values, or inspect RFC 9562 version, variant, and embedded timestamps.',
  },
  timestamp: {
    name: 'Timestamp',
    description: 'Convert a Unix timestamp back to a human-readable date.',
  },
  'base64-encode': {
    name: 'Base64 Encode',
    description: 'Encode a string to Base64.',
  },
  'word-wrap': {
    name: 'Word Wrap',
    description:
      'Wrap text to a column width at word boundaries. Use ::wrap=N for width N (default 80).',
  },
  a1z26: {
    name: 'A1Z26',
    description:
      'Encode letters to their position numbers (A=1..Z=26) or decode numbers back to letters.',
  },
  'ascii-code': {
    name: 'ASCII Code',
    description:
      'Look up a character or a code point: decimal, hex, octal, binary, and the glyph.',
  },
  'aspect-ratio': {
    name: 'Aspect Ratio',
    description:
      'Simplify width x height into an aspect ratio (e.g. 1920x1080 → 16:9).',
  },
  base32: {
    name: 'Base32',
    description:
      'RFC 4648 Base32 encode/decode. ::base32 to encode, ::base32decode to decode.',
  },
  base58: {
    name: 'Base58',
    description:
      'Encode text to Base58 (Bitcoin alphabet) or decode Base58 back to text.',
  },
  base62: {
    name: 'Base62',
    description:
      'Encode a non-negative integer to Base62, or decode a Base62 string to a number.',
  },
  base85: {
    name: 'Base85',
    description:
      'Encode text to Ascii85 (Base85) or decode Ascii85 back to text.',
  },
  base91: {
    name: 'basE91',
    description: 'Encode text to basE91 or decode a basE91 string.',
  },
  'text-to-binary': {
    name: 'Text to Binary',
    description:
      'Convert text to space-separated 8-bit binary (UTF-8), or binary back to text.',
  },
  bmi: {
    name: 'BMI',
    description:
      'Compute Body Mass Index. Input: "<weight>kg <height>m" or "<weight>lb <height>in".',
  },
  'dice-roll': {
    name: 'Dice Roll',
    description:
      'Roll six-sided dice. Specify a count from 1 to 20; defaults to 1. ::roll or ::dice=3.',
  },
  easter: {
    name: 'Easter',
    description:
      'Compute the date of Easter Sunday (Gregorian) and Lunar New Year for a given year.',
  },
  fraction: {
    name: 'Fraction',
    description:
      'Convert a decimal to a simplified fraction, or a fraction (a/b) to a decimal.',
  },
  frequency: {
    name: 'Frequency',
    description: 'Count character frequencies in the input, sorted by count.',
  },
  'gcd-lcm': {
    name: 'GCD / LCM',
    description:
      'Compute the GCD and LCM of a list of integers (comma or space separated).',
  },
  distance: {
    name: 'Distance',
    description:
      'Great-circle distance between two coordinates. Input: "lat1,lng1 to lat2,lng2".',
  },
  'line-tools': {
    name: 'Line Tools',
    description: 'De-duplicate or reverse the lines of a text block.',
  },
  'power-convert': {
    name: 'Power Convert',
    description: 'Convert power between W, kW, mW, MW, hp, PS, BTU/h.',
  },
  semver: {
    name: 'Semver',
    description:
      'Parse and validate a Semantic Version string into its components.',
  },
  snowflake: {
    name: 'Snowflake',
    description:
      'Parse a Snowflake ID (Discord/Twitter) into its timestamp and components.',
  },
  'sort-lines': {
    name: 'Sort Lines',
    description:
      'Sort the lines of text. ::sortlines (asc), modifiers ::desc, ::numeric, ::unique, ::ci (case-insensitive).',
  },
  soundex: {
    name: 'Soundex',
    description:
      'Compute the American Soundex phonetic code for each word in the input.',
  },
  'speed-convert': {
    name: 'Speed Convert',
    description: 'Convert a speed between m/s, km/h, mph, knots, and ft/s.',
  },
  subnet: {
    name: 'Subnet',
    description:
      'Calculate IPv4 CIDR or IP/netmask subnets, split a network, and test membership with ::subnet.',
  },
  temperature: {
    name: 'Temperature',
    description:
      'Convert a temperature between Celsius, Fahrenheit and Kelvin. e.g. "100C ::temp".',
  },
  'text-diff': {
    name: 'Text Diff',
    description:
      'Paste a second text with ::diff, or separate two texts with --- and use ::textdiff.',
  },
  'text-reverse': {
    name: 'Text Reverse',
    description:
      'Reverse the characters of the input string without splitting grapheme clusters.',
  },
  'twos-complement': {
    name: "Two's Complement",
    description:
      "Show the two's-complement binary/hex of an integer at a bit width. ::twos=<bits> (default 8).",
  },
  ulid: {
    name: 'ULID',
    description:
      'Generate a ULID (::ulid) or decode the timestamp of an existing ULID (::ulid=<ulid> or ::ulidparse).',
  },
  'unicode-normalize': {
    name: 'Unicode Normalize',
    description:
      'Normalize text to a Unicode form (NFC/NFD/NFKC/NFKD). ::normalize=nfc (default NFC).',
  },
  'unit-converter': {
    name: 'Unit Converter',
    description:
      'Convert units automatically for length, area, volume, mass, temperature, speed, pressure, power, energy, data size, data rate, and time (e.g. 100 km, 50 MB to GB, 37 C).',
  },
  'week-number': {
    name: 'Week Number',
    description:
      'Compute the ISO 8601 week number (and weekday, day-of-year) for a date.',
  },
  'whitespace-clean': {
    name: 'Whitespace Clean',
    description:
      'Trim each line, collapse internal whitespace runs, and remove blank lines.',
  },
  'words-to-number': {
    name: 'Words to Number',
    description:
      'Parse English number words into an integer (e.g. "one thousand two hundred" → 1200).',
  },
  'zodiac-sign': {
    name: 'Zodiac Sign',
    description:
      'Determine the Western zodiac sign for a date (MM-DD or YYYY-MM-DD).',
  },
  'word-count': {
    name: 'Word Count',
    description: 'Count the lines, words and characters in any input.',
  },
  'markdown-toc': {
    name: 'Markdown TOC',
    description:
      'Generate a table of contents (nested bullet list with anchor links) from Markdown headings.',
  },
  punycode: {
    name: 'Punycode',
    description:
      'Convert an internationalized domain name to/from its Punycode (xn--) ASCII form.',
  },
  'radix-convert': {
    name: 'Radix Convert',
    description:
      'Convert an integer between arbitrary bases (2-36). e.g. ::radix=16:2 for hex→binary.',
  },
  'query-string': {
    name: 'Query String',
    description:
      'Convert a URL query string to JSON, or a flat JSON object to a query string.',
  },
  'hex-dump': {
    name: 'Hex Dump',
    description:
      'Produce a canonical hex + ASCII dump of the input (like hexdump -C).',
  },
  'text-to-hex': {
    name: 'Text to Hex',
    description:
      'Convert text to a hex string (UTF-8) or decode a hex string back to text.',
  },
  'url-parse': {
    name: 'URL Parse',
    description:
      'Break a URL into protocol, host, port, path, query, and hash.',
  },
  'readable-text-color': {
    name: 'Readable Text Color',
    description:
      'Given a background hex color, pick the readable foreground (black or white) and the WCAG contrast.',
  },
  'credit-card-info': {
    name: 'Credit Card Info',
    description:
      'Detect the card brand from a number and check Luhn validity (masks the number).',
  },
  'glob-to-regex': {
    name: 'Glob to Regex',
    description:
      'Convert a shell glob pattern (*, ?, [...], **) into an anchored regular expression.',
  },
  hsv: {
    name: 'HSV',
    description: 'Convert a color between hex/RGB and HSV (HSB).',
  },
  ipv6: {
    name: 'IPv6',
    description: 'Expand and compress an IPv6 address (RFC 5952).',
  },
  'ieee-754': {
    name: 'IEEE 754',
    description:
      'Show the IEEE-754 (double + single) bit representation of a number, or decode a hex pattern back to a float.',
  },
  'mac-address': {
    name: 'MAC Address',
    description:
      'Normalize a MAC address and show its formats, OUI prefix, and flags.',
  },
  'morse-code': {
    name: 'Morse Code',
    description: 'Encode text to Morse code or decode Morse code back to text.',
  },
  'port-lookup': {
    name: 'Port Lookup',
    description: 'Look up a well-known port number or service name. ::port',
  },
  'unicode-escape': {
    name: 'Unicode Escape',
    description:
      'Escape text to \\uXXXX sequences, or unescape \\uXXXX / \\u{...} back to text.',
  },
  hmac: {
    name: 'HMAC',
    description:
      'Compute HMAC of the input with a key: ::hmac=<key>. Select algorithms with ::sha256, ::sha1, ::sha512 (default: all); each also accepts the key, e.g. ::sha512=<key>.',
  },
  pbkdf2: {
    name: 'PBKDF2',
    description:
      'Derive a key from the input password: ::pbkdf2=<salt>. Options ::iterations=<n>, ::dklen=<bytes>, and the PRF via ::prf=sha256|sha1|sha512 or bare ::sha256/::sha1/::sha512 (default HMAC-SHA256).',
  },
  'local-ai': {
    name: 'Local AI',
    description:
      'Run a small language model entirely in this browser with WebGPU: ask, translate, rewrite or summarize. Nothing is downloaded or generated until you ask for it, and prompts never leave the device. ::ai',
  },
  'crc-32': {
    name: 'CRC-32',
    description: 'Compute the CRC-32 (IEEE 802.3) checksum of the input text.',
  },
  'crockford-base32': {
    name: 'Crockford Base32',
    description:
      "Encode text to Crockford's Base32 or decode it back (case-insensitive, no padding).",
  },
  'case-converter': {
    name: 'Case Converter',
    description:
      'Convert each line between camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, Title Case, dot.case, path/case, Sentence case, lowercase and UPPERCASE. Use ::case to list formats or ::case=<format> to select one.',
  },
  'certificate-decode': {
    name: 'Certificate Decode',
    description: 'Decode PEM X.509 certificates and CA bundles locally. ::cert',
  },
  'cheat-sheet': {
    name: 'Cheat Sheet',
    description:
      'Offline command examples. Enter curl, cheat:git, or ::cheat=jq.',
  },
  coordinates: {
    name: 'Coordinates',
    description:
      'Convert a coordinate between decimal degrees, DDM, DMS, Plus Code, Geohash, UTM, MGRS and geo URI. ::coord shows every format; ::dms, ::pluscode, ::geohash, ::utm, … show just that one. Accepts lat/lng in any of the angle formats, a full Plus Code or a Geohash.',
  },
  'html-entities': {
    name: 'HTML Entities',
    description:
      'Decode HTML5 character references without parsing markup, or encode text with ::htmlencode (add =all to encode non-ASCII characters).',
  },
  'http-status': {
    name: 'HTTP Status',
    description:
      'Look up an IANA-assigned HTTP status by code or exact reason phrase with ::http, http 502, or status 404.',
  },
  'chmod-calculator': {
    name: 'chmod Calculator',
    description:
      'Convert absolute octal, rwx symbolic, and u/g/o permission modes with ::chmod. Use ::umask=022 for standard new-file and directory permissions.',
  },
};

const tw: Record<BoxSourceId, BoxSourceTranslation> = {
  color: {
    name: '顏色',
    description:
      '在 HEX、RGB 與 HSL 色彩之間轉換；使用 ::cmyk、::lighten、::darken 或 ::colormix 可處理更多格式與調整。',
  },
  'color-contrast': {
    name: '色彩對比',
    description: '計算兩個十六進位色彩的 WCAG 對比率（以空格或換行分隔）。',
  },
  'escape-string': {
    name: '逸出字串',
    description: '取消 JSON 逸出字串（\\"），並移除 ANSI 色彩碼。',
  },
  'base64-decode': {
    name: 'Base64 解碼',
    description: '將 Base64 編碼的字串解碼回可讀文字。',
  },
  'cron-expression': {
    name: 'Cron 表達式',
    description: '將 cron 表達式翻譯成人類可讀的排程。',
  },
  'data-converter': {
    name: '資料轉換器',
    description: '在 JSON、YAML、TOML 與 XML 之間格式化及轉換。',
  },
  'json-tools': {
    name: 'JSON 工具',
    description:
      '合併、挑選或排除欄位、查詢（RFC 6901 JSON Pointer），以及在 JSON 與 JSONL 之間轉換。可使用 ::jsonmerge（以 --- 分隔的物件）、::jsonpick=a,b、::jsonomit=a,b、::jsonpointer=/a/0、::tojsonl、::fromjsonl、::jsonl（自動判斷）。',
  },
  'date-calculate': {
    name: '日期計算',
    description: '對日期加減日曆或時間單位，或計算兩個日期之間的時間長度。',
  },
  duration: {
    name: '持續時間',
    description:
      '將數值秒數、毫秒或人類可讀的持續時間格式轉換為時間長度與時鐘格式，反之亦然。',
  },
  'generate-qr-code': {
    name: '產生 QR Code',
    description: '將任何輸入轉成可掃描的 QR Code。',
  },
  hash: {
    name: '雜湊',
    description: '使用 Web Crypto 計算 SHA 雜湊，並提供 MD5 舊式校驗碼。',
  },
  'jwt-decode': {
    name: 'JWT 解碼',
    description:
      '解碼 JWT，依偏好時區顯示 NumericDate 宣告，並可使用 ::secret 驗證 HS256/HS384/HS512。',
  },
  objectid: {
    name: 'ObjectId',
    description:
      '解析 MongoDB ObjectId 的時間戳記、隨機值與計數器，使用 ::objectid。',
  },
  ksuid: {
    name: 'KSUID',
    description: '解析 KSUID 的時間戳記與 128 位元負載，使用 ::ksuid。',
  },
  'k8s-secret': {
    name: 'K8s Secret',
    description: '將 Kubernetes Secret YAML 內的所有值以 Base64 解碼。',
  },
  'math-expression': {
    name: '數學表達式',
    description: '使用標準運算子計算數學表達式。',
  },
  'my-ip': { name: '我的 IP', description: '顯示你的公開 IP 位址與地理位置。' },
  now: {
    name: '現在時間',
    description: '顯示 UTC、偏好時區的目前時間，以及 Unix 時間戳記。',
  },
  'password-generator': {
    name: '密碼產生器',
    description: '產生安全的隨機密碼。',
  },
  'random-integer': {
    name: '隨機整數',
    description: '在自訂範圍內產生隨機整數。',
  },
  'readable-bytes': {
    name: '可讀位元組',
    description: '將以逗號分隔的位元組陣列轉成可讀字串。',
  },
  'shorten-url': {
    name: '短網址',
    description: '產生短網址，也可指定自訂別名。',
  },
  'time-format': {
    name: '時間格式',
    description: '將 RFC 3339 時間戳記轉換為 Unix 秒數與毫秒數。',
  },
  'url-decode': { name: 'URL 解碼', description: '解碼百分比編碼的字串。' },
  uuid: {
    name: 'UUID',
    description:
      '產生 UUID v4 或 v7，或檢視 RFC 9562 版本、變體與內嵌時間戳記。',
  },
  timestamp: {
    name: '時間戳記',
    description: '將 Unix 時間戳記轉回人類可讀的日期。',
  },
  'base64-encode': {
    name: 'Base64 編碼',
    description: '將字串編碼為 Base64。',
  },
  'word-wrap': {
    name: '文字換行',
    description: '依照欄寬在單字邊界換行；使用 ::wrap=N 指定寬度（預設 80）。',
  },
  a1z26: {
    name: 'A1Z26',
    description: '將字母編碼為位置數字（A=1…Z=26），或將數字解碼回字母。',
  },
  'ascii-code': {
    name: 'ASCII 碼',
    description: '查詢字元或碼點：十進位、十六進位、八進位、二進位與字形。',
  },
  'aspect-ratio': {
    name: '長寬比',
    description: '將寬 x 高化簡為長寬比（例如 1920x1080 → 16:9）。',
  },
  base32: {
    name: 'Base32',
    description:
      'RFC 4648 Base32 編碼與解碼。使用 ::base32 編碼，使用 ::base32decode 解碼。',
  },
  base58: {
    name: 'Base58',
    description:
      '以 Base58（Bitcoin 字母表）編碼文字，或將 Base58 解碼回文字。',
  },
  base62: {
    name: 'Base62',
    description: '將非負整數編碼為 Base62，或將 Base62 字串解碼為數字。',
  },
  base85: {
    name: 'Base85',
    description: '以 Ascii85（Base85）編碼文字，或將 Ascii85 解碼回文字。',
  },
  base91: {
    name: 'basE91',
    description: '以 basE91 編碼文字，或將 basE91 字串解碼。',
  },
  'text-to-binary': {
    name: '文字轉二進位',
    description:
      '將文字轉為以空格分隔的 8 位元二進位（UTF-8），或將二進位轉回文字。',
  },
  bmi: {
    name: 'BMI',
    description:
      '計算身體質量指數。輸入格式為「<體重>kg <身高>m」或「<體重>lb <身高>in」。',
  },
  'dice-roll': {
    name: '骰子',
    description:
      '擲六面骰。可指定 1 到 20 顆，預設為 1 顆。使用 ::roll 或 ::dice=3。',
  },
  easter: {
    name: '復活節',
    description: '計算指定年份的復活節星期日（公曆）與農曆新年日期。',
  },
  fraction: {
    name: '分數',
    description: '將小數轉為最簡分數，或將分數（a/b）轉為小數。',
  },
  frequency: { name: '頻率', description: '計算字元出現頻率，依次數排序。' },
  'gcd-lcm': {
    name: 'GCD / LCM',
    description: '計算一組整數（以逗號或空格分隔）的最大公因數與最小公倍數。',
  },
  distance: {
    name: '距離',
    description:
      '計算兩組座標之間的大圓距離。輸入格式為「lat1,lng1 to lat2,lng2」。',
  },
  'line-tools': {
    name: '行工具',
    description: '移除文字區塊中的重複行或反轉行。',
  },
  'power-convert': {
    name: '功率轉換',
    description: '在 W、kW、mW、MW、hp、PS 與 BTU/h 之間轉換功率。',
  },
  semver: {
    name: 'Semver',
    description: '將語意化版本字串解析並驗證為各個組成部分。',
  },
  snowflake: {
    name: 'Snowflake',
    description:
      '解析 Snowflake ID（Discord/Twitter）的時間戳記與各個組成部分。',
  },
  'sort-lines': {
    name: '行排序',
    description:
      '排序文字行。使用 ::sortlines（升冪），並可搭配 ::desc、::numeric、::unique、::ci 修飾。',
  },
  soundex: {
    name: 'Soundex',
    description: '為輸入中的每個單字計算美式 Soundex 語音碼。',
  },
  'speed-convert': {
    name: '速度轉換',
    description: '在 m/s、km/h、mph、節與 ft/s 之間轉換速度。',
  },
  subnet: {
    name: '子網路',
    description:
      '計算 IPv4 CIDR 或 IP/網路遮罩子網路、切分網路，並使用 ::subnet 測試成員資格。',
  },
  temperature: {
    name: '溫度',
    description: '在攝氏、華氏與克耳文之間轉換溫度，例如「100C ::temp」。',
  },
  'text-diff': {
    name: '文字差異',
    description:
      '使用 ::diff 貼上第二段文字，或以 --- 分隔兩段文字並使用 ::textdiff。',
  },
  'text-reverse': {
    name: '文字反轉',
    description: '反轉字串中的字元，不拆分字素叢集。',
  },
  'twos-complement': {
    name: '二補數',
    description:
      '以指定位元寬度顯示整數的二補數二進位與十六進位。使用 ::twos=<bits>（預設 8）。',
  },
  ulid: {
    name: 'ULID',
    description:
      '產生 ULID（::ulid），或解碼既有 ULID 的時間戳記（::ulid=<ulid> 或 ::ulidparse）。',
  },
  'unicode-normalize': {
    name: 'Unicode 正規化',
    description:
      '將文字正規化為 Unicode 形式（NFC/NFD/NFKC/NFKD）。::normalize=nfc（預設 NFC）。',
  },
  'unit-converter': {
    name: '單位轉換器',
    description:
      '自動轉換長度、面積、體積、質量、溫度、速度、壓力、功率、能量、資料大小、資料速率與時間等單位。',
  },
  'week-number': {
    name: '週次',
    description: '計算日期的 ISO 8601 週次（以及星期幾、年度第幾天）。',
  },
  'whitespace-clean': {
    name: '空白清理',
    description: '修剪每一行、合併內部空白，並移除空白行。',
  },
  'words-to-number': {
    name: '文字轉數字',
    description:
      '將英文數字單字解析為整數（例如「one thousand two hundred」→ 1200）。',
  },
  'zodiac-sign': {
    name: '星座',
    description: '依日期（MM-DD 或 YYYY-MM-DD）判斷西洋星座。',
  },
  'word-count': {
    name: '字數統計',
    description: '計算任何輸入的行數、單字數與字元數。',
  },
  'markdown-toc': {
    name: 'Markdown 目錄',
    description: '從 Markdown 標題產生目錄（含錨點連結的巢狀項目清單）。',
  },
  punycode: {
    name: 'Punycode',
    description:
      '將國際化網域名稱轉換為 Punycode（xn--）ASCII 格式，或反向轉換。',
  },
  'radix-convert': {
    name: '進位轉換',
    description:
      '在任意進位（2–36）之間轉換整數，例如 ::radix=16:2 將十六進位轉為二進位。',
  },
  'query-string': {
    name: '查詢字串',
    description: '將 URL 查詢字串轉為 JSON，或將扁平 JSON 物件轉為查詢字串。',
  },
  'hex-dump': {
    name: '十六進位傾印',
    description: '產生標準的十六進位與 ASCII 傾印（類似 hexdump -C）。',
  },
  'text-to-hex': {
    name: '文字轉十六進位',
    description:
      '將文字（UTF-8）轉為十六進位字串，或將十六進位字串解碼回文字。',
  },
  'url-parse': {
    name: 'URL 解析',
    description: '拆解 URL 的通訊協定、主機、連接埠、路徑、查詢字串與雜湊。',
  },
  'readable-text-color': {
    name: '可讀文字色彩',
    description:
      '根據背景十六進位色彩選擇可讀的前景色（黑或白）與 WCAG 對比度。',
  },
  'credit-card-info': {
    name: '信用卡資訊',
    description: '辨識卡片品牌並檢查 Luhn 有效性（遮罩卡號）。',
  },
  'glob-to-regex': {
    name: 'Glob 轉正規表示式',
    description: '將 shell glob 模式（*、?、[…]、**）轉為有錨點的正規表示式。',
  },
  hsv: {
    name: 'HSV',
    description: '在十六進位／RGB 與 HSV（HSB）之間轉換色彩。',
  },
  ipv6: { name: 'IPv6', description: '展開與壓縮 IPv6 位址（RFC 5952）。' },
  'ieee-754': {
    name: 'IEEE 754',
    description:
      '顯示數字的 IEEE-754（雙精度與單精度）位元表示，或將十六進位模式解碼回浮點數。',
  },
  'mac-address': {
    name: 'MAC 位址',
    description: '正規化 MAC 位址並顯示其格式、OUI 前綴與旗標。',
  },
  'morse-code': {
    name: '摩斯密碼',
    description: '將文字編碼為摩斯密碼，或將摩斯密碼解碼回文字。',
  },
  'port-lookup': {
    name: '連接埠查詢',
    description: '查詢常見連接埠號碼或服務名稱。使用 ::port。',
  },
  'unicode-escape': {
    name: 'Unicode 逸出',
    description:
      '將文字逸出為 \\\\uXXXX 序列，或將 \\\\uXXXX／\\\\u{...} 解碼回文字。',
  },
  hmac: {
    name: 'HMAC',
    description:
      '使用金鑰計算輸入的 HMAC：::hmac=<key>。可使用 ::sha256、::sha1、::sha512 選擇演算法（預設全部）；每個演算法也接受金鑰，例如 ::sha512=<key>。',
  },
  pbkdf2: {
    name: 'PBKDF2',
    description:
      '從輸入密碼衍生金鑰：::pbkdf2=<salt>。可設定 ::iterations=<n>、::dklen=<bytes>，並透過 ::prf=sha256|sha1|sha512 或單獨使用 ::sha256/::sha1/::sha512 指定 PRF（預設 HMAC-SHA256）。',
  },
  'local-ai': {
    name: '本地 AI',
    description:
      '在瀏覽器中以 WebGPU 完全執行小型語言模型，可提問、翻譯、改寫或摘要。未經要求不會下載或產生內容，提示也不會離開裝置。::ai',
  },
  'crc-32': {
    name: 'CRC-32',
    description: '計算輸入文字的 CRC-32（IEEE 802.3）校驗碼。',
  },
  'crockford-base32': {
    name: 'Crockford Base32',
    description:
      '以 Crockford Base32 編碼文字，或將其解碼回文字（不分大小寫、不使用填充）。',
  },
  'case-converter': {
    name: '大小寫轉換',
    description:
      '逐行在 camelCase、PascalCase、snake_case、CONSTANT_CASE、kebab-case、標題式、dot.case、path/case、句首大寫、小寫與大寫之間轉換。使用 ::case 列出所有格式，或用 ::case=<format> 選擇單一格式。',
  },
  'certificate-decode': {
    name: '憑證解碼',
    description: '在本機解碼 PEM X.509 憑證與 CA 憑證鏈。使用 ::cert。',
  },
  'cheat-sheet': {
    name: '速查表',
    description: '離線指令範例。輸入 curl、cheat:git 或 ::cheat=jq。',
  },
  coordinates: {
    name: '座標',
    description:
      '在十進位角度、DDM、DMS、Plus Code、Geohash、UTM、MGRS 與 geo URI 之間轉換座標。::coord 顯示所有格式；::dms、::pluscode、::geohash、::utm、… 只顯示指定格式。接受各種角度格式的 lat/lng、完整 Plus Code 或 Geohash。',
  },
  'html-entities': {
    name: 'HTML 字元實體',
    description:
      '解碼 HTML5 字元參照而不剖析標記，或使用 ::htmlencode 編碼文字（加上 =all 也會編碼非 ASCII 字元）。',
  },
  'http-status': {
    name: 'HTTP 狀態碼',
    description:
      '依代碼或完全相符的原因短語查詢 IANA 註冊的 HTTP 狀態碼；可使用 ::http、http 502 或 status 404。',
  },
  'chmod-calculator': {
    name: 'chmod 權限計算器',
    description:
      '使用 ::chmod 轉換完整八進位、rwx 符號與 u/g/o 絕對權限設定。使用 ::umask=022 計算新檔案與目錄的預設權限。',
  },
};

export const boxSourceTranslations: Record<
  Locale,
  Record<BoxSourceId, BoxSourceTranslation>
> = { en, tw };

export const kindTranslations: Record<Locale, Record<string, string>> = {
  en: {
    Decode: 'Decode',
    Encode: 'Encode',
    Time: 'Time',
    Format: 'Format',
    Transform: 'Transform',
    Compute: 'Compute',
    Generate: 'Generate',
    Analyze: 'Analyze',
    Info: 'Info',
    Convert: 'Convert',
    Calculate: 'Calculate',
    Hash: 'Hash',
    Validate: 'Validate',
    Reference: 'Reference',
  },
  tw: {
    Decode: '解碼',
    Encode: '編碼',
    Time: '時間',
    Format: '格式',
    Transform: '轉換',
    Compute: '計算',
    Generate: '產生',
    Analyze: '分析',
    Info: '資訊',
    Convert: '轉換',
    Calculate: '計算',
    Hash: '雜湊',
    Validate: '驗證',
    Reference: '參考',
  },
};

const idByEnglishName = Object.fromEntries(
  Object.entries(en).map(([id, metadata]) => [metadata.name, id]),
) as Record<string, BoxSourceId>;

const isBoxSourceId = (value: string): value is BoxSourceId =>
  (BOX_SOURCE_IDS as readonly string[]).includes(value);

interface SourceLike {
  id?: string;
  name: string;
  description: string;
  kind?: string;
}

export interface LocalizedBoxSource extends BoxSourceTranslation {
  kind: string;
}

export const getBoxSourceId = (source: SourceLike): BoxSourceId | null => {
  if (source.id && isBoxSourceId(source.id)) return source.id;
  return idByEnglishName[source.name] ?? null;
};

export const getBoxSourceKind = (
  kind: string | undefined,
  locale: Locale,
): string => kindTranslations[locale][kind ?? ''] ?? kind ?? '';

export const getBoxSourceDisplay = (
  source: SourceLike,
  locale: Locale,
): LocalizedBoxSource => {
  const id = getBoxSourceId(source);
  const metadata = id ? boxSourceTranslations[locale][id] : null;
  return {
    name: metadata?.name ?? source.name,
    description: metadata?.description ?? source.description,
    kind: getBoxSourceKind(source.kind, locale),
  };
};
