<h1 align="center">Magic Box</h1>

<p align="center">～ Quick In Quick Out ～</p>

<p align="center">
  <a href="#">
    <img
        alt="GitHub Workflow Status (with event)"
        src="https://img.shields.io/github/actions/workflow/status/xiaoxiaosn/magic-box/firebase-hosting.yaml?style=flat-square"
    />
  </a>
  <a href="#">
    <img
      src="https://img.shields.io/badge/license-MIT%2FApache--2.0-informational?style=flat-square"
      alt="License"
    />
  </a>
</p>

---

## Usage 🏁

Magic Box parses user input into two parts: `input` and `options`.

For example, when Magic Box receives the following user input:
The input will be `https://youtu.be/dQw4w9WgXcQ` and the option key is `shorten` with the value `document`.

```
https://youtu.be/dQw4w9WgXcQ
::shorten=document
```

Each `::option` must start its own line; `hello ::base32` on one line is read as plain input. `::option=` with nothing after `=` is the same as a bare `::option`.

Based on matching methods, we can roughly classify Boxes into two types:

1. match by the `input` string
2. match by `options`

### Keyboard Shortcuts ⌨️

- Ctrl + n: move to the next Box
- Ctrl + Shift + n: move to the previous Box
- Ctrl + p: move to the previous Box
- Enter: copy the selected Box output to clipboard
- Cmd/Ctrl + Enter: copy the selected Box output and paste it into the input field (recalculates results)

## Tool catalog

Generated from the same BoxSource registry used by [/list](https://mb.10oz.tw/list).
The descriptions, examples and recognized option keys below are checked in CI.
[llms.txt](public/llms.txt) is generated from that registry too.

<!-- BEGIN GENERATED TOOL CATALOG -->

All 88 registered tools. Each line break in an example is significant; put each `::option` on its own line. Enable tools marked **off** in Settings before using them on the web.

Option keys include aliases and routing controls; a dash means the source matches input without a tool-specific option. See the description and detailed guides for accepted values.

| Tool | Kind | Default | Description | Example input | Option keys |
| --- | --- | --- | --- | --- | --- |
| [Color](src/modules/boxSources/ColorBoxSource.ts) | Convert | on | Convert HEX, RGB, and HSL colors; use ::cmyk, ::lighten, ::darken, or ::colormix for more formats and adjustments. | <code>#ff6347</code> | <code>::blend</code>, <code>::cmyk</code>, <code>::colormix</code>, <code>::darken</code>, <code>::lighten</code>, <code>::mixcolor</code> |
| [Color Contrast](src/modules/boxSources/ColorContrastBoxSource.ts) | Analyze | **off** | WCAG contrast ratio between two hex colors (space- or newline-separated). | <code>#000000 #ffffff<br>::contrast</code> | <code>::contrast</code> |
| [Escape String](src/modules/boxSources/EscapeStringBoxSource.ts) | Decode | on | Unescape JSON-escaped strings (\") and strip ANSI color codes. | <code>"{\"message\":\"something here\"}"</code> | — |
| [Base64 Decode](src/modules/boxSources/Base64BoxSource.ts) | Decode | on | Decode a Base64 encoded string back into readable text. | <code>SGVsbG8gV29ybGQK</code> | — |
| [Cron Expression](src/modules/boxSources/CronExpressionBoxSource.ts) | Time | on | Translate cron expressions into human-readable schedules. | <code>*/5 0 12 * * ?</code> | <code>::l</code>, <code>::lang</code>, <code>::locale</code> |
| [Data Converter](src/modules/boxSources/DataConverterBoxSource.ts) | Format | on | Pretty-print and convert between JSON, YAML, TOML and XML. | <code>{"name":"John Doe","age":30,"isStudent":false,"courses":[{"name":"History","credits":3},{"name":"Math","credits":4}]}<br><br>::toYAML<br>::toTOML<br>::toXML</code> | <code>::fromjsonl</code>, <code>::json</code>, <code>::jsonl</code>, <code>::jsonmerge</code>, <code>::jsonomit</code>, <code>::jsonpick</code>, <code>::jsonpointer</code>, <code>::jsonptr</code>, <code>::merge</code>, <code>::ndjson</code>, <code>::tojson</code>, <code>::tojsonl</code>, <code>::toml</code>, <code>::totoml</code>, <code>::toxml</code>, <code>::toyaml</code>, <code>::toyml</code>, <code>::xml</code>, <code>::yaml</code>, <code>::yml</code> |
| [JSON Tools](src/modules/boxSources/JsonToolsBoxSource.ts) | Transform | **off** | Merge, pick/omit, query (RFC 6901 JSON Pointer) and JSONL-convert JSON. ::jsonmerge (objects separated by a --- line), ::jsonpick=a,b, ::jsonomit=a,b, ::jsonpointer=/a/0, ::tojsonl, ::fromjsonl, ::jsonl (auto). | <code>{"a":1,"b":{"x":1}}<br>---<br>{"b":{"y":2},"c":3}<br>::jsonmerge</code> | <code>::fromjsonl</code>, <code>::jsonl</code>, <code>::jsonmerge</code>, <code>::jsonomit</code>, <code>::jsonpick</code>, <code>::jsonpointer</code>, <code>::jsonptr</code>, <code>::merge</code>, <code>::ndjson</code>, <code>::tojsonl</code> |
| [Date Calculate](src/modules/boxSources/DateCalculateBoxSource.ts) | Time | on | Add or subtract days from a date, or compute the duration between two dates. | <code>now + 7d</code> | <code>::relative</code>, <code>::relativetime</code>, <code>::timeago</code>, <code>::timelater</code> |
| [Duration](src/modules/boxSources/DurationBoxSource.ts) | Convert | on | Convert numeric seconds/milliseconds or human duration formats (e.g. 10s, 8789sec, 1m48s, 1h3s) to/from human durations and clock formats. | <code>3661<br>::duration</code> | <code>::duration</code>, <code>::duration2s</code>, <code>::humanize</code>, <code>::humantime</code>, <code>::parseduration</code> |
| [Generate QR Code](src/modules/boxSources/GenerateQRCodeBoxSource.ts) | Transform | on | Turn any input into a scannable QR code. | <code>https://mb.10oz.tw/list<br>::qrcode<br></code> | <code>::qr</code>, <code>::qrcode</code> |
| [Hash](src/modules/boxSources/HashBoxSource.ts) | Hash | on | Compute cryptographic hashes (SHA-1, SHA-256, SHA-512) of the input text via Web Crypto. | <code>hello world<br>::sha256</code> | <code>::hash</code>, <code>::sha1</code>, <code>::sha256</code>, <code>::sha512</code> |
| [JWT Decode](src/modules/boxSources/JWTBoxSource.ts) | Decode | on | Decode the header and payload of a JSON Web Token. | <code>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c</code> | — |
| [K8s Secret](src/modules/boxSources/K8sSecretBoxSource.ts) | Decode | on | Base64-decode all values inside a Kubernetes Secret YAML. | <code>apiVersion: v1<br>kind: Secret<br>metadata:<br>  name: mysecret<br>type: Opaque<br>data:<br>  username: dXNlcg==<br>  password: cGFzc3dvcmQ=</code> | — |
| [Math Expression](src/modules/boxSources/MathExpressionBoxSource.ts) | Compute | on | Evaluate mathematical expressions with standard operators. | <code>1 + 2 * (3 + 4) / 5</code> | — |
| [My IP](src/modules/boxSources/MyIPBoxSource.ts) | Info | on | Show your public IP address along with geolocation. | <code>ip</code> | — |
| [Now](src/modules/boxSources/NowBoxSource.ts) | Time | on | Display the current time in UTC, the preferred timezone (default UTC+8), and Unix timestamp. | <code>now</code> | — |
| [Password Generator](src/modules/boxSources/PasswordBoxSource.ts) | Generate | on | Generates a secure random password. | <code>::password</code> | <code>::len</code>, <code>::nolower</code>, <code>::nonumbers</code>, <code>::nosymbols</code>, <code>::noupper</code>, <code>::pass</code>, <code>::password</code>, <code>::pwd</code> |
| [Random Integer](src/modules/boxSources/RandomIntegerBoxSource.ts) | Generate | on | Generate a random integer in a range of your choosing. | <code>random 1-6</code> | — |
| [Readable Bytes](src/modules/boxSources/ReadableBytesBoxSource.ts) | Decode | on | Turn a comma-separated byte array into a readable string. | <code>83, 116, 114, 105, 110, 103, 32, 116, 111, 32, 66, 121, 116, 101, 115</code> | — |
| [Shorten URL](src/modules/boxSources/ShortenURLBoxSource.ts) | Transform | on | Generate a short URL with an optional custom alias. | <code>https://github.com/XiaoXiaoSN/magic-box<br>::surl<br></code> | <code>::shorten</code>, <code>::surl</code> |
| [Time Format](src/modules/boxSources/TimeFormatBoxSource.ts) | Time | on | Convert an RFC 3339 timestamp into Unix seconds and milliseconds. | <code>2025-06-21T19:34:57.530+08:00</code> | — |
| [URL Decode](src/modules/boxSources/URLDecodeBoxSource.ts) | Decode | on | Decode percent-encoded strings. | <code>https%3A%2F%2Fgithub.com%2FXiaoXiaoSN%2Fmagic-box%3Ftab%3Dreadme</code> | — |
| [UUID](src/modules/boxSources/UuidBoxSource.ts) | Generate | on | Generate a fresh UUID v4, uppercase optional. | <code>uuid</code> | <code>::upper</code>, <code>::uppercase</code> |
| [Timestamp](src/modules/boxSources/TimestampBoxSource.ts) | Time | on | Convert a Unix timestamp back to a human-readable date. | <code>1735794245</code> | — |
| [Base64 Encode](src/modules/boxSources/Base64BoxSource.ts) | Encode | on | Encode a string to Base64. | <code>Hello World</code> | — |
| [Word Wrap](src/modules/boxSources/WordWrapBoxSource.ts) | Transform | **off** | Wrap text to a column width at word boundaries. Use ::wrap=N for width N (default 80). | <code>The quick brown fox jumps over the lazy dog<br>::wrap=20</code> | <code>::wordwrap</code>, <code>::wrap</code> |
| [A1Z26](src/modules/boxSources/A1Z26BoxSource.ts) | Encode | **off** | Encode letters to their position numbers (A=1..Z=26) or decode numbers back to letters. | <code>hello<br>::a1z26</code> | <code>::a1z26</code>, <code>::a1z26decode</code>, <code>::a1z26encode</code> |
| [ASCII Code](src/modules/boxSources/AsciiTableBoxSource.ts) | Convert | **off** | Look up a character or a code point: decimal, hex, octal, binary, and the glyph. | <code>A<br>::ascii</code> | <code>::ascii</code>, <code>::charcode</code> |
| [Aspect Ratio](src/modules/boxSources/AspectRatioBoxSource.ts) | Convert | **off** | Simplify width x height into an aspect ratio (e.g. 1920x1080 → 16:9). | <code>1920x1080<br>::ratio</code> | <code>::aspect</code>, <code>::ratio</code> |
| [Base32](src/modules/boxSources/Base32BoxSource.ts) | Encode | **off** | RFC 4648 Base32 encode/decode. ::base32 to encode, ::base32decode to decode. | <code>hello<br>::base32</code> | <code>::base32</code>, <code>::base32decode</code>, <code>::base32encode</code> |
| [Base58](src/modules/boxSources/Base58BoxSource.ts) | Encode | **off** | Encode text to Base58 (Bitcoin alphabet) or decode Base58 back to text. | <code>Hello World!<br>::base58</code> | <code>::base58</code>, <code>::base58decode</code>, <code>::base58encode</code> |
| [Base62](src/modules/boxSources/Base62BoxSource.ts) | Convert | **off** | Encode a non-negative integer to Base62, or decode a Base62 string to a number. | <code>123456789<br>::base62</code> | <code>::base62</code>, <code>::base62decode</code>, <code>::base62encode</code> |
| [Base85](src/modules/boxSources/Base85BoxSource.ts) | Encode | **off** | Encode text to Ascii85 (Base85) or decode Ascii85 back to text. | <code>hello<br>::base85</code> | <code>::ascii85</code>, <code>::base85</code>, <code>::base85decode</code>, <code>::base85encode</code> |
| [basE91](src/modules/boxSources/Base91BoxSource.ts) | Encode | **off** | Encode text to basE91 or decode a basE91 string. | <code>hello<br>::base91</code> | <code>::base91</code>, <code>::base91decode</code>, <code>::base91encode</code> |
| [Text to Binary](src/modules/boxSources/BinaryTextBoxSource.ts) | Encode | **off** | Convert text to space-separated 8-bit binary (UTF-8), or binary back to text. | <code>Hi<br>::binary</code> | <code>::binary</code>, <code>::binarydecode</code>, <code>::frombinary</code>, <code>::tobinary</code> |
| [BMI](src/modules/boxSources/BmiBoxSource.ts) | Calculate | **off** | Compute Body Mass Index. Input: "&lt;weight&gt;kg &lt;height&gt;m" or "&lt;weight&gt;lb &lt;height&gt;in". | <code>70kg 1.75m<br>::bmi</code> | <code>::bmi</code> |
| [Dice Roll](src/modules/boxSources/DiceRollBoxSource.ts) | Generate | **off** | Roll six-sided dice. Specify a count from 1 to 20; defaults to 1. ::roll or ::dice=3. | <code>::roll</code> | <code>::dice</code>, <code>::roll</code> |
| [Easter](src/modules/boxSources/EasterBoxSource.ts) | Calculate | **off** | Compute the date of Easter Sunday (Gregorian) and Lunar New Year for a given year. | <code>2025<br>::easter</code> | <code>::cny</code>, <code>::easter</code>, <code>::lny</code>, <code>::lunarnewyear</code> |
| [Fraction](src/modules/boxSources/FractionBoxSource.ts) | Convert | **off** | Convert a decimal to a simplified fraction, or a fraction (a/b) to a decimal. | <code>0.75<br>::fraction</code> | <code>::fraction</code>, <code>::tofraction</code> |
| [Frequency](src/modules/boxSources/FrequencyBoxSource.ts) | Analyze | **off** | Count character frequencies in the input, sorted by count. | <code>hello world<br>::freq</code> | <code>::freq</code>, <code>::frequency</code> |
| [GCD / LCM](src/modules/boxSources/GcdLcmBoxSource.ts) | Calculate | **off** | Compute the GCD and LCM of a list of integers (comma or space separated). | <code>12, 18, 24<br>::gcd</code> | <code>::gcd</code>, <code>::lcm</code> |
| [Distance](src/modules/boxSources/HaversineBoxSource.ts) | Calculate | **off** | Great-circle distance between two coordinates. Input: "lat1,lng1 to lat2,lng2". | <code>40.7128,-74.0060 to 51.5074,-0.1278<br>::haversine</code> | <code>::distance</code>, <code>::haversine</code> |
| [Line Tools](src/modules/boxSources/LineToolsBoxSource.ts) | Transform | **off** | Sort, de-duplicate, or reverse the lines of a text block. | <code>banana<br>apple<br>cherry<br>apple<br>::sortlines</code> | <code>::reverselines</code>, <code>::sortlines</code>, <code>::uniquelines</code> |
| [Power Convert](src/modules/boxSources/PowerConvertBoxSource.ts) | Convert | **off** | Convert power between W, kW, MW, hp, PS, BTU/h. | <code>100 hp<br>::power</code> | <code>::power</code> |
| [Semver](src/modules/boxSources/SemverBoxSource.ts) | Analyze | **off** | Parse and validate a Semantic Version string into its components. | <code>1.2.3-beta.1+build.5<br>::semver</code> | <code>::semver</code> |
| [Snowflake](src/modules/boxSources/SnowflakeBoxSource.ts) | Analyze | **off** | Parse a Snowflake ID (Discord/Twitter) into its timestamp and components. | <code>175928847299117063<br>::snowflake</code> | <code>::epoch</code>, <code>::snowflake</code> |
| [Sort Lines](src/modules/boxSources/SortLinesBoxSource.ts) | Transform | **off** | Sort the lines of text. ::sortlines (asc), modifiers ::desc, ::numeric, ::unique, ::ci (case-insensitive). | <code>banana<br>apple<br>cherry<br>::sortlines</code> | <code>::caseinsensitive</code>, <code>::ci</code>, <code>::desc</code>, <code>::numeric</code>, <code>::reverse</code>, <code>::sort</code>, <code>::sortlines</code>, <code>::uniq</code>, <code>::unique</code> |
| [Soundex](src/modules/boxSources/SoundexBoxSource.ts) | Analyze | **off** | Compute the American Soundex phonetic code for each word in the input. | <code>Robert<br>::soundex</code> | <code>::soundex</code> |
| [Speed Convert](src/modules/boxSources/SpeedConvertBoxSource.ts) | Convert | **off** | Convert a speed between m/s, km/h, mph, knots, and ft/s. | <code>100 km/h<br>::speed</code> | <code>::speed</code> |
| [Subnet](src/modules/boxSources/SubnetBoxSource.ts) | Analyze | **off** | IPv4 CIDR subnet calculator. e.g. 192.168.1.10/24 ::subnet. | <code>192.168.1.10/24<br>::subnet</code> | <code>::cidr</code>, <code>::subnet</code> |
| [Temperature](src/modules/boxSources/TemperatureBoxSource.ts) | Convert | **off** | Convert a temperature between Celsius, Fahrenheit and Kelvin. e.g. "100C ::temp". | <code>100C<br>::temp</code> | <code>::temp</code>, <code>::temperature</code> |
| [Text Diff](src/modules/boxSources/TextDiffBoxSource.ts) | Analyze | on | Paste a second text with ::diff, or separate two texts with --- and use ::textdiff. | <code>foo<br>bar<br>::diff<br>::lang=yaml</code> | <code>::diff</code>, <code>::l</code>, <code>::lang</code>, <code>::language</code>, <code>::linediff</code>, <code>::textdiff</code> |
| [Text Reverse](src/modules/boxSources/TextReverseBoxSource.ts) | Transform | **off** | Reverse the characters of the input string (Unicode code-point aware). | <code>hello 😀<br>::reverse</code> | <code>::reverse</code>, <code>::reversetext</code> |
| [Two's Complement](src/modules/boxSources/TwosComplementBoxSource.ts) | Convert | **off** | Show the two's-complement binary/hex of an integer at a bit width. ::twos=&lt;bits&gt; (default 8). | <code>-42<br>::twos=8</code> | <code>::twos</code>, <code>::twoscomplement</code> |
| [ULID](src/modules/boxSources/UlidBoxSource.ts) | Generate | **off** | Generate a ULID (::ulid) or decode the timestamp of an existing ULID (::ulid=&lt;ulid&gt; or ::ulidparse). | <code>::ulid</code> | <code>::ulid</code>, <code>::ulidparse</code> |
| [Unicode Normalize](src/modules/boxSources/UnicodeNormalizeBoxSource.ts) | Transform | **off** | Normalize text to a Unicode form (NFC/NFD/NFKC/NFKD). ::normalize=nfc (default NFC). | <code>café<br>::normalize=nfd</code> | <code>::normalize</code>, <code>::unicodenormalize</code> |
| [Unit Converter](src/modules/boxSources/UnitConverterBoxSource.ts) | Convert | on | Convert units automatically for length, area, volume, mass, temperature, speed, pressure, power, energy, data size, data rate, and time (e.g. 100 km, 50 MB to GB, 37 C). | <code>100 km to mi</code> | <code>::convert</code>, <code>::unit</code> |
| [Week Number](src/modules/boxSources/WeekNumberBoxSource.ts) | Analyze | **off** | Compute the ISO 8601 week number (and weekday, day-of-year) for a date. | <code>2024-01-01<br>::weeknum</code> | <code>::isoweek</code>, <code>::weeknum</code> |
| [Whitespace Clean](src/modules/boxSources/WhitespaceCleanBoxSource.ts) | Transform | **off** | Trim each line, collapse internal whitespace runs, and remove blank lines. | <code>  hello   world  <br><br><br>  foo  bar<br>::clean</code> | <code>::clean</code>, <code>::cleanws</code> |
| [Words to Number](src/modules/boxSources/WordsToNumberBoxSource.ts) | Convert | **off** | Parse English number words into an integer (e.g. "one thousand two hundred" → 1200). | <code>one million two hundred thirty-four thousand<br>::wordstonum</code> | <code>::wordstonum</code>, <code>::wordstonumber</code> |
| [Zodiac Sign](src/modules/boxSources/ZodiacBoxSource.ts) | Calculate | **off** | Determine the Western zodiac sign for a date (MM-DD or YYYY-MM-DD). | <code>03-21<br>::zodiac</code> | <code>::starsign</code>, <code>::zodiac</code> |
| [Word Count](src/modules/boxSources/WordCountBoxSource.ts) | Analyze | on | Count the lines, words and characters in any input. | <code>There are so many sounds in the world.<br>i'mdifficult<br></code> | — |
| [Markdown TOC](src/modules/boxSources/MarkdownTocBoxSource.ts) | Transform | **off** | Generate a table of contents (nested bullet list with anchor links) from Markdown headings. | <code># Title<br>## Section A<br>### Sub<br>## Section B<br>::toc</code> | <code>::tableofcontents</code>, <code>::toc</code> |
| [Punycode](src/modules/boxSources/PunycodeBoxSource.ts) | Encode | **off** | Convert an internationalized domain name to/from its Punycode (xn--) ASCII form. | <code>münchen.de<br>::punycode</code> | <code>::idn</code>, <code>::idndecode</code>, <code>::punycode</code>, <code>::punycodedecode</code>, <code>::punycodeencode</code> |
| [Radix Convert](src/modules/boxSources/RadixBoxSource.ts) | Convert | **off** | Convert an integer between arbitrary bases (2-36). e.g. ::radix=16:2 for hex→binary. | <code>ff<br>::radix=16:2</code> | <code>::baseconvert</code>, <code>::radix</code> |
| [Query String](src/modules/boxSources/QueryStringBoxSource.ts) | Convert | **off** | Convert a URL query string to JSON, or a flat JSON object to a query string. | <code>a=1&amp;b=2&amp;b=3<br>::qs</code> | <code>::qs</code>, <code>::querystring</code> |
| [Hex Dump](src/modules/boxSources/HexDumpBoxSource.ts) | Analyze | **off** | Produce a canonical hex + ASCII dump of the input (like hexdump -C). | <code>Hello, World!<br>::hexdump</code> | <code>::hexdump</code>, <code>::xxd</code> |
| [Text to Hex](src/modules/boxSources/HexTextBoxSource.ts) | Encode | **off** | Convert text to a hex string (UTF-8) or decode a hex string back to text. | <code>Hi<br>::hex</code> | <code>::fromhex</code>, <code>::hex</code>, <code>::hexdecode</code>, <code>::tohex</code> |
| [URL Parse](src/modules/boxSources/UrlParseBoxSource.ts) | Analyze | **off** | Break a URL into protocol, host, port, path, query, and hash. | <code>https://user:pass@example.com:8080/a/b?x=1&amp;y=2#frag<br>::urlparse</code> | <code>::parseurl</code>, <code>::urlparse</code> |
| [Readable Text Color](src/modules/boxSources/OnColorBoxSource.ts) | Analyze | **off** | Given a background hex color, pick the readable foreground (black or white) and the WCAG contrast. | <code>#3498db<br>::oncolor</code> | <code>::oncolor</code>, <code>::textcolor</code> |
| [Credit Card Info](src/modules/boxSources/CreditCardInfoBoxSource.ts) | Validate | **off** | Detect the card brand from a number and check Luhn validity (masks the number). | <code>4111111111111111<br>::cardinfo</code> | <code>::cardinfo</code>, <code>::cardtype</code>, <code>::creditcard</code> |
| [Glob to Regex](src/modules/boxSources/GlobToRegexBoxSource.ts) | Convert | **off** | Convert a shell glob pattern (*, ?, [...], **) into an anchored regular expression. | <code>src/**/*.ts<br>::glob2regex</code> | <code>::glob2regex</code>, <code>::globregex</code> |
| [HSV](src/modules/boxSources/HsvBoxSource.ts) | Convert | **off** | Convert a color between hex/RGB and HSV (HSB). | <code>#ff6347<br>::hsv</code> | <code>::hsb</code>, <code>::hsv</code> |
| [IPv6](src/modules/boxSources/Ipv6BoxSource.ts) | Convert | **off** | Expand and compress an IPv6 address (RFC 5952). | <code>2001:db8::1<br>::ipv6</code> | <code>::ipv6</code> |
| [IEEE 754](src/modules/boxSources/Ieee754BoxSource.ts) | Analyze | **off** | Show the IEEE-754 (double + single) bit representation of a number, or decode a hex pattern back to a float. | <code>3.14<br>::ieee754</code> | <code>::floatbits</code>, <code>::ieee754</code> |
| [MAC Address](src/modules/boxSources/MacAddressBoxSource.ts) | Convert | **off** | Normalize a MAC address and show its formats, OUI prefix, and flags. | <code>01:23:45:67:89:ab<br>::mac</code> | <code>::mac</code>, <code>::macaddress</code> |
| [Morse Code](src/modules/boxSources/MorseCodeBoxSource.ts) | Encode | **off** | Encode text to Morse code or decode Morse code back to text. | <code>SOS<br>::morse</code> | <code>::morse</code>, <code>::morsedecode</code>, <code>::morseencode</code> |
| [Port Lookup](src/modules/boxSources/PortLookupBoxSource.ts) | Decode | **off** | Look up a well-known port number or service name. ::port | <code>443<br>::port</code> | <code>::port</code>, <code>::portlookup</code> |
| [Unicode Escape](src/modules/boxSources/UnicodeEscapeBoxSource.ts) | Encode | **off** | Escape text to \uXXXX sequences, or unescape \uXXXX / \u{...} back to text. | <code>héllo 😀<br>::unicodeescape</code> | <code>::uescape</code>, <code>::unicodeescape</code>, <code>::unicodeunescape</code>, <code>::uunescape</code> |
| [HMAC](src/modules/boxSources/HmacBoxSource.ts) | Encode | **off** | Compute HMAC of the input with a key: ::hmac=&lt;key&gt;. Select algorithms with ::sha256, ::sha1, ::sha512 (default: all); each also accepts the key, e.g. ::sha512=&lt;key&gt;. | <code>The quick brown fox jumps over the lazy dog<br>::hmac=key</code> | <code>::hmac</code>, <code>::hmacsha1</code>, <code>::hmacsha256</code>, <code>::hmacsha512</code>, <code>::sha1</code>, <code>::sha256</code>, <code>::sha512</code> |
| [PBKDF2](src/modules/boxSources/Pbkdf2BoxSource.ts) | Encode | **off** | Derive a key from the input password: ::pbkdf2=&lt;salt&gt;. Options ::iterations=&lt;n&gt;, ::dklen=&lt;bytes&gt;, and the PRF via ::prf=sha256&#124;sha1&#124;sha512 or bare ::sha256/::sha1/::sha512 (default HMAC-SHA256). | <code>password<br>::pbkdf2=salt</code> | <code>::dklen</code>, <code>::iterations</code>, <code>::pbkdf2</code>, <code>::prf</code>, <code>::sha1</code>, <code>::sha256</code>, <code>::sha512</code> |
| [Local AI](src/modules/boxSources/LocalAIBoxSource.ts) | Generate | on | Run a small language model entirely in this browser with WebGPU: ask, translate, rewrite or summarize. Nothing is downloaded or generated until you ask for it, and prompts never leave the device. ::ai | <code>::ai</code> | <code>::ai</code>, <code>::localai</code> |
| [CRC-32](src/modules/boxSources/Crc32BoxSource.ts) | Encode | **off** | Compute the CRC-32 (IEEE 802.3) checksum of the input text. | <code>hello<br>::crc32</code> | <code>::crc32</code> |
| [Crockford Base32](src/modules/boxSources/CrockfordBase32BoxSource.ts) | Encode | **off** | Encode text to Crockford's Base32 or decode it back (case-insensitive, no padding). | <code>hello<br>::crockford</code> | <code>::crockford</code>, <code>::crockforddecode</code>, <code>::crockfordencode</code> |
| [Case Converter](src/modules/boxSources/CaseConverterBoxSource.ts) | Convert | **off** | Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, dot.case, Title Case, Sentence case, lowercase and UPPERCASE. ::case lists every format; ::case=&lt;format&gt; or a single-format option (::camel, ::snake, ::kebab, ::upper, ::lower, …) shows just that one. | <code>hello world foo bar<br>::case</code> | <code>::camel</code>, <code>::camelcase</code>, <code>::case</code>, <code>::constant</code>, <code>::constantcase</code>, <code>::dot</code>, <code>::dotcase</code>, <code>::kebab</code>, <code>::kebabcase</code>, <code>::lower</code>, <code>::lowercase</code>, <code>::pascal</code>, <code>::pascalcase</code>, <code>::sentence</code>, <code>::sentencecase</code>, <code>::snake</code>, <code>::snakecase</code>, <code>::title</code>, <code>::titlecase</code>, <code>::upper</code>, <code>::uppercase</code> |
| [Certificate Decode](src/modules/boxSources/CertificateBoxSource.ts) | Decode | on | Decode PEM X.509 certificates and CA bundles locally. ::cert | <code>Paste a PEM certificate here<br>::cert</code> | <code>::ca</code>, <code>::cert</code>, <code>::certificate</code> |
| [Cheat Sheet](src/modules/boxSources/CheatSheetBoxSource.ts) | Reference | on | Offline command examples. Enter curl, cheat:git, or ::cheat=jq. | <code>curl</code> | <code>::cheat</code>, <code>::cheatsheet</code> |
| [Coordinates](src/modules/boxSources/CoordinateBoxSource.ts) | Convert | **off** | Convert a coordinate between decimal degrees, DDM, DMS, Plus Code, Geohash, UTM, MGRS and geo URI. ::coord shows every format; ::dms, ::pluscode, ::geohash, ::utm, … show just that one. Accepts lat/lng in any of the angle formats, a full Plus Code or a Geohash. | <code>40.446195, -79.948862<br>::coord</code> | <code>::coord</code>, <code>::coords</code>, <code>::dd</code>, <code>::ddm</code>, <code>::decimal</code>, <code>::dms</code>, <code>::geo</code>, <code>::geohash</code>, <code>::geouri</code>, <code>::latlng</code>, <code>::latlon</code>, <code>::mgrs</code>, <code>::olc</code>, <code>::pluscode</code>, <code>::utm</code> |

<!-- END GENERATED TOOL CATALOG -->

## Detailed usage

<details>
<summary> <b>ColorBox</b> </summary>

| match rule                          | description                                        | example                  |
| ----------------------------------- | -------------------------------------------------- | ------------------------ |
| hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) | convert to HEX, RGB, and HSL              | `#ff6347`                |
| `rgb()` / `rgba()`                  | convert to HEX, RGB, and HSL (alpha preserved)     | `rgb(255, 99, 71)`       |
| `hsl()` / `hsla()`                  | convert to HEX, RGB, and HSL (alpha preserved)     | `hsl(9, 100%, 64%)`      |

</details>

<details>
<summary> <b>Base64Box</b> </summary>

| match rule                    | description   | output                     |
| ----------------------------- | ------------- | -------------------------- |
| valid string                  | base64 encode | ![](docs/Base64Encode.png) |
| can be decode to valid string | base64 decode | ![](docs/Base64Decode.png) |

</details>

<details>
<summary> <b>CronExpressionBox</b> </summary>

| match rule            | description               | output                    |
| --------------------- | ------------------------- | ------------------------- |
| valid cron expression | convert to human language | ![](docs/CronExpress.png) |

| options                          | description                             | example     |
| -------------------------------- | --------------------------------------- | ----------- |
| `l`, `lang`, `locale`            | select the output language             | ::locale=tw |

Cron uses the app locale unless overridden by one of these options. It does
not shift schedules with a timezone option.

</details>

<details>
<summary> <b>DataConverter</b> </summary>

| match rule                | description                              | output                      |
| ------------------------- | ---------------------------------------- | --------------------------- |
| valid JSON/YAML/TOML/XML  | formatted output for the detected format | ![](docs/DataConverter.png) |
| option `json` or `tojson` | convert input to formatted JSON          | formatted JSON              |
| option `yaml` or `toyaml` | convert input to formatted YAML          | formatted YAML              |
| option `toml` or `totoml` | convert input to formatted TOML          | formatted TOML              |
| option `xml` or `toxml`   | convert input to formatted XML           | formatted XML               |

YAML input resolves anchors/aliases and expands YAML 1.1 merge keys (`<<: *anchor`). A `---`-separated multi-document stream is read as a list of documents: it converts to a JSON/XML array and round-trips back to a `---`-separated YAML stream. When a `to*` option is given but the input cannot be parsed or cannot be represented in the target format, the error is shown instead of an empty result.

</details>

<details>
<summary> <b>JsonToolsBox</b> (disabled by default)</summary>

Put the option on its own line after the JSON. Use one operation at a time; the DataConverter auto-format is skipped while a JSON Tools option is present.

| options                    | description                                                                                         | example                    |
| -------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| `jsonmerge`, `merge`       | deep-merge two or more JSON objects separated by a `---` line; later wins, arrays replace           | `::jsonmerge`              |
| `jsonpick`                 | keep the listed top-level keys (not paths; missing keys are skipped)                                | `::jsonpick=a,c`           |
| `jsonomit`                 | drop the listed top-level keys                                                                      | `::jsonomit=b`             |
| `jsonpointer`, `jsonptr`   | resolve an [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) JSON Pointer; no value = whole document | `::jsonpointer=/a/b/1`     |
| `tojsonl`                  | JSON array → JSONL (one value per line)                                                             | `::tojsonl`                |
| `fromjsonl`                | JSONL → JSON array                                                                                  | `::fromjsonl`              |
| `jsonl`, `ndjson`          | auto: a whole JSON array converts to JSONL, anything else is read as JSONL                          | `::jsonl`                  |

Merge is a plain deep merge, not RFC 7396 JSON Merge Patch: `null` is kept as a value instead of deleting the key. In auto JSONL mode a single line holding an array (e.g. `[1,2]`) is read as a JSON array; use `::fromjsonl` to read it as one JSONL record.

</details>

<details>
<summary> <b>DateCalculateBox</b> </summary>

| match rule          | description                              | example               | output                      |
| ------------------- | ---------------------------------------- | --------------------- | --------------------------- |
| `date1` + `number`d | add days to a date                       | `now + 7d`            | ![](docs/DateCalculate.png) |
| `date1` - `number`d | subtract days from a date                | `2025-01-01 - 30d`    |                             |
| `date1` to `date2`  | calculate the duration between two dates | `today to 2025-12-31` |                             |

</details>

<details>
<summary> <b>GenerateQRCodeBox</b> </summary>

| match rule                       | description      | output                       |
| -------------------------------- | ---------------- | ---------------------------- |
| contains option `qr` or `qrcode` | generate QR Code | ![](docs/GenerateQRCode.png) |

| options        | description | example    |
| -------------- | ----------- | ---------- |
| `qr`, `qrcode` | --          | `::QRCode` |

</details>

<details>
<summary> <b>HashBox</b> </summary>

| match rule                               | description                           | output           |
| ---------------------------------------- | ------------------------------------- | ---------------- |
| contains option `hash`, `sha1`, `sha256`, or `sha512` | compute cryptographic hash of the input | lowercase hex digest |

| options  | description                              | example      |
| -------- | ---------------------------------------- | ------------ |
| `hash`   | compute SHA-1, SHA-256, and SHA-512      | `::hash`     |
| `sha1`   | compute SHA-1 digest                     | `::sha1`     |
| `sha256` | compute SHA-256 digest                   | `::sha256`   |
| `sha512` | compute SHA-512 digest                   | `::sha512`   |

MD5 is intentionally omitted — it is not available in Web Crypto, and adding an npm dependency for a broken algorithm is not worthwhile.

</details>

<details>
<summary> <b>JWTBox</b> </summary>

| match rule       | description                | output                  |
| ---------------- | -------------------------- | ----------------------- |
| valid JWT string | decode JWT header and body | ![](docs/JWTDecode.png) |

</details>

<details>
<summary> <b>K8sSecretBox</b> </summary>

| match rule                 | description                               | output                  |
| -------------------------- | ----------------------------------------- | ----------------------- |
| valid K8s Secret YAML/JSON | decode base64 values in a K8s Secret data | ![](docs/K8sSecret.png) |

</details>

<details>
<summary> <b>LocalAIBox</b> (experimental) </summary>

Runs a small language model entirely in the browser with WebGPU. Opening the box
measures the real download by itself, so setup is a single button already
labelled with what it costs: **Download model · <size>** — or **Load model ·
<size>** when the files are cached. That click is the consent, and no weights are
fetched before it, on any visit. Turn **Check the model automatically** off in
**Settings → Local AI** to make the check a click too. You can also download it
ahead of time from **Settings → Local AI**. Prompts and answers stay in the
page: they never reach a server or the search history, and telemetry is muted
for the rest of the visit once the box is open. See [docs/local-ai.md](docs/local-ai.md).

Text written in front of the directive — or after it on the same line, as in
`::ai what is WebGPU?` — is the prompt, so `say hello` + `::ai` runs as soon as
the model is loaded in that tab — the box says when a
prompt came from the input, and a share link you create would carry it. Turn
**Auto-run input prompts** off in Settings → Local AI to always press **Run
locally** yourself.

| match rule                         | description                                   | example      |
| ---------------------------------- | --------------------------------------------- | ------------ |
| contains option `ai` or `localai`  | open the on-device assistant panel            | `::ai`       |

| options            | description                                                   | example      |
| ------------------ | ------------------------------------------------------------- | ------------ |
| `ai`, `localai`    | ask, translate, rewrite or summarize with a local model        | `say hello\n::ai` |

Requires HTTPS and a WebGPU browser with `shader-f16`. The model is
Qwen2.5-0.5B-Instruct (`q4f16`, 467.3 MiB) at a pinned revision; prompts are
capped at 1,024 tokens and answers at 256 tokens. Small-model answers can be
wrong, and there is no cloud or CPU fallback.

</details>

<details>
<summary> <b>MathExpressionBox</b> </summary>

Powered by the in-tree [`math-box`](wasmModules/math-box/) WASM module —
a clean-room expression evaluator written in Rust, replacing `mathjs` since
v0.2 to keep the bundle small and the licence pure MIT/Apache-2.0.

| match rule         | description               | output                       |
| ------------------ | ------------------------- | ---------------------------- |
| valid math express | calculate the math result | ![](docs/MathExpression.png) |

Supported syntax (highlights):

- arithmetic `+ - * / % ^`, factorial `5!`, function calls `sin(PI/2)`
- variables and statement chaining: `x = 5; y = 7; x*y + x^2`
- user-defined functions: `sq(x) = x^2; sq(11) + sq(13)`
- BigInt literals via `n` suffix: `9007199254740993n + 1n`
- fractions: `frac(1, 3) + frac(1, 4)` → `7/12`
- complex numbers: `(2 + 3*i) * (2 - 3*i)` → `13`
- units: `1 km + 500 m to m` → `1500 m` (length / mass / time SI)

See the [math-box README](wasmModules/math-box/README.md) for the
implemented syntax, numeric behavior and limits, and
[BENCHMARK.md](wasmModules/math-box/BENCHMARK.md) for performance vs `mathjs`.

</details>

<details>
<summary> <b>MyIPBox</b> </summary>

| match rule     | description                                | output             |
| -------------- | ------------------------------------------ | ------------------ |
| `ip` or `myip` | fetch and show your public IP and location | ![](docs/MyIP.png) |

</details>

<details>
<summary> <b>NowBox</b> </summary>

| match rule          | description                                                                                    | output            |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| input matches `now` | show RFC 3339 in UTC and the preferred timezone (default UTC+8), plus Unix timestamp | ![](docs/Now.png) |

</details>

<details>
<summary> <b>PasswordBox</b> </summary>

| match rule                                    | description                                        | output |
| --------------------------------------------- | -------------------------------------------------- | ------ |
| contains option `password`, `pwd`, or `pass`  | generate 3 secure random password candidates       |        |

| options                    | description                                      | example           |
| -------------------------- | ------------------------------------------------ | ----------------- |
| `password`, `pwd`, `pass`  | trigger; optionally set length (`::password=24`) | `::password=24`   |
| `len`                      | password length (default: 16, range: 4–256)      | `::len=32`        |
| `nosymbols`                | exclude symbol characters                        | `::nosymbols`     |
| `nonumbers`                | exclude numeric characters                       | `::nonumbers`     |
| `nolower`                  | exclude lowercase letters                        | `::nolower`       |
| `noupper`                  | exclude uppercase letters                        | `::noupper`       |

</details>

<details>
<summary> <b>ShortenURLBox</b> </summary>

| match rule                          | description            | output                   |
| ----------------------------------- | ---------------------- | ------------------------ |
| contains option `surl` or `shorten` | generate a shorten URL | ![](docs/ShortenURL.png) |

| options           | description                                                        | example      |
| ----------------- | ------------------------------------------------------------------ | ------------ |
| `surl`, `shorten` | desired short URL result, if not set, a random string will be used | `::surl=foo` |

</details>

<details>
<summary> <b>TimeFormat</b> </summary>

| match rule                 | description                         | output                   |
| -------------------------- | ----------------------------------- | ------------------------ |
| valid RFC 3339 time string | timestamp in second and millisecond | ![](docs/TimeFormat.png) |

</details>

<details>
<summary> <b>TimestampBox</b> </summary>

| match rule                                                                               | description                                | output                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------- |
| valid timestamp. to avoid match all of number string, it only receive 1600 AD to 2500 AD | the time of timestamp in `RFC 3339` format | ![](docs/Timestamp.png) |

</details>

<details>
<summary> <b>URLDecode</b> </summary>

| match rule         | description                | output                          |
| ------------------ | -------------------------- | ------------------------------- |
| URL-encoded string | decoded URL-encoded string | ![](docs/URLEncodingDecode.png) |

</details>

<details>
<summary> <b>RandomIntegerBox</b> </summary>

| match rule           | description                                  | example       | output               |
| -------------------- | -------------------------------------------- | ------------- | -------------------- |
| `random`             | generate a random number between 0 and 100   | `random`      | ![](docs/Random.png) |
| `random` `max`       | generate a random number between 0 and max   | `random 1000` |                      |
| `random` `min`-`max` | generate a random number between min and max | `random 1-6`  |                      |

</details>

<details>
<summary> <b>ReadableBytesBox</b> </summary>

| match rule | description                                                          | example                  | output                      |
| ---------- | -------------------------------------------------------------------- | ------------------------ | --------------------------- |
| byte array | convert a byte array (comma or space separated) to a readable string | `72, 101, 108, 108, 111` | ![](docs/ReadableBytes.png) |

</details>

<details>
<summary> <b>UuidBox</b> </summary>

| match rule | description                     | output             |
| ---------- | ------------------------------- | ------------------ |
| `uuid`     | generate a new random UUID (v4) | ![](docs/UUID.png) |

| options              | description              | example   |
| -------------------- | ------------------------ | --------- |
| `upper`, `uppercase` | return UUID in uppercase | `::upper` |

</details>

<details>
<summary> <b>WordCountBox</b> </summary>

| match rule | description                        | output                  |
| ---------- | ---------------------------------- | ----------------------- |
| any string | count lines, words, and characters | ![](docs/WordCount.png) |

</details>

### Dice Roll

Enable **Dice Roll** in Settings, then enter `::roll` on its own line for a d6,
or `::roll=3` for three six-sided dice.

![Dice Roll output](docs/DiceRoll.png)

## Development ⛑️

Use Bun 1.3.4 (the `packageManager` version in `package.json`), a current Rust
stable toolchain with the `wasm32-unknown-unknown` target, and wasm-pack 0.15.0.
CI also installs Node.js 22 for tooling; Bun runs the development scripts.
Build both local WASM packages before installing the root dependencies:

```bash
bun run build:wasm
bun install --frozen-lockfile
bun run start
```

### Development Commands

- `bun run build:wasm` - Build both local WASM packages before installing dependencies
- `bun run start` - Start development server on port 3000
- `bun run build` - Build for production (runs TypeScript compiler + Vite build)
- `bun run test` - Run unit tests with Vitest
- `bun run test:ui` - Run tests with Vitest UI
- `bun run lint` - Run Biome check
- `bun run lint:fix` - Run Biome check with auto-fix
- `bun run test:e2e` - Run Cypress E2E tests
- `bun run cypress` - Open Cypress test runner

### Keeping tool documentation current

After adding a source to `src/modules/boxSources/index.ts` or changing its
metadata/options, run `bun run docs:generate` and commit the generated README
catalog and `public/llms.txt`. `bun run docs:check` checks both without writing;
the quality CI job runs it on every PR. The generator reads TypeScript syntax
without executing a tool. Unrecognized metadata/option expressions fail with a
file and expression to update in `scripts/generate-tool-docs.mjs`. A source that
delegates option parsing to a shared helper can expose `optionKeys` referencing
the same constant, as JSON Tools does. The generator uses a pinned TypeScript
5.x parser under the `typescript-docs` alias because TypeScript 7 no longer
exports that parser API; the application compiler remains TypeScript 7.

### Testing

- Unit tests use Vitest with jsdom environment
- E2E tests use Cypress with custom commands in `cypress/support/`

### Prepare Deploy

Initial Deployment Preparation

```bash
npm install -g firebase-tools

firebase login
firebase init
```

```bash
firebase deploy
```

## Terminal UI (TUI) 🖥️

Magic Box has an experimental [Ink](https://github.com/vadimdemedes/ink)
terminal UI. It shares the web tool registry and supports local WASM tools,
including Base64 and Math, plus structured outputs such as JSON, JWT and K8s
Secrets.

```bash
bun run tui "uuid"
printf 'uuid\n::uppercase' | bun run tui
bun run tui --json '1 + 2 * 3'
bun run tui                         # interactive prompt in a terminal

# To run with Node, build the TypeScript/JSX entry first:
bun run tui:build
bun run tui:node --json '2 * 3'
```

Use these repository scripts; the source entry declared in `package.json`'s
`bin` field is not a standalone Node executable. Keep the installed dependencies
and WASM packages beside the compiled entry.

The terminal renders each box's plaintext output; the web uses semantic view
hints for its richer presentation. The terminal excludes **Generate QR Code**
and **Local AI** (browser capabilities), and **My IP** and **Shorten URL**
(network requests). All other registered sources are available, including tools
that are disabled by default on the web.

See [the terminal guide](docs/terminal-ui.md) for preferences, clipboard support,
input modes and architecture.

## License 📃

Magic Box is licensed under MIT and Apache 2.0 dual-licensed.

You may obtain a copy of the License at [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE)
