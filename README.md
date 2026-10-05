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

Convert, decode, generate and inspect text in one place.
[Open Magic Box](https://mb.10oz.tw/) · [Browse tools](https://mb.10oz.tw/list)

## Usage 🏁

Magic Box parses user input into two parts: `input` and `options`.

For example, this input shortens a URL using the alias `document`:

```
https://youtu.be/dQw4w9WgXcQ
::shorten=document
```

Each `::option` must start its own line; `hello ::base32` on one line is read as plain input. `::option=` with nothing after `=` is the same as a bare `::option`.

Tools match either the input itself (such as a color or timestamp) or an
explicit option (such as `::sha256`).

### Keyboard Shortcuts ⌨️

- Ctrl + n: move to the next Box
- Ctrl + Shift + n: move to the previous Box
- Ctrl + p: move to the previous Box
- Enter: copy the selected Box output to clipboard
- Cmd/Ctrl + Enter: copy the selected Box output and paste it into the input field (recalculates results)

## Tools 🧰

Browse the [interactive tool list](https://mb.10oz.tw/list) or the
[complete tool reference](docs/tools.md) for every tool's description, example
and options. Tools disabled by default can be enabled in Settings.

Expand the examples below for usage tips and screenshots.

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

MD5 is not supported.

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

Ask, translate, rewrite or summarize with a model running locally in your
browser. Open it with `::ai` or `::localai`, then choose **Download model**
to get started. Requires HTTPS and a WebGPU browser with `shader-f16`.

```text
Explain what WebGPU is
::ai
```

Prompts stay on the device. A prompt supplied with the input runs when the
model is loaded unless **Auto-run input prompts** is disabled in Settings.
See the [Local AI guide](docs/local-ai.md) for model size, setup and privacy
controls.

</details>

<details>
<summary> <b>MathExpressionBox</b> </summary>

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
implemented syntax, numeric behavior and limits.

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

<details>
<summary> <b>DiceRollBox</b> (disabled by default) </summary>

Enable **Dice Roll** in Settings, then enter `::roll` on its own line for one
six-sided die, or `::roll=3` for three dice (up to 20).

![Dice Roll output](docs/DiceRoll.png)

</details>

## Terminal UI (TUI) 🖥️

Run Magic Box in your terminal after following the [local setup](DEVELOPER.md#local-setup):

```bash
bun run tui "uuid"
printf 'uuid\n::uppercase' | bun run tui
bun run tui --json '1 + 2 * 3'
```

See the [terminal guide](docs/terminal-ui.md) for interactive mode, Node usage,
preferences and supported tools.

## Development ⛑️

See [DEVELOPER.md](DEVELOPER.md) for setup, development commands, testing,
documentation maintenance and deployment.

## License 📃

Magic Box is licensed under MIT and Apache 2.0 dual-licensed.

You may obtain a copy of the License at [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE)
