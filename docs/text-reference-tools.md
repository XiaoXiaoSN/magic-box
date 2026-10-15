# Text and Reference Tools

These tools are disabled by default and run locally in the web app and TUI. Add the directive on its own line.

## Case Converter

Use `::case` to list camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, Title Case, dot.case, path/case, Sentence case, lowercase, and UPPERCASE. Use `::case=snake` or a single-format alias such as `::camel`, `::path`, or `::upper` to show one result. Each retained line is converted separately, and internal blank lines remain. The shared input parser normalizes CRLF and CR line endings to LF and trims surrounding whitespace before conversion. Case boundaries use Unicode uppercase/lowercase letters; letter-to-number boundaries are split, so `v2ApiKey` becomes `v_2_api_key`. CJK and emoji are retained. Inputs are limited to 100 KiB.

## HTML Entities

A valid semicolon-terminated character reference can match automatically when decoding changes the text. Use `::htmldecode` to force HTML5 text-context decoding, including legacy references such as `&amp` without a semicolon. Unknown semicolon-terminated names are preserved. This decodes character references only; literal markup remains text and is never parsed as a document.

Use `::htmlencode` to encode `&`, `<`, `>`, double quotes, and apostrophes. Use `::htmlencode=all` to also encode non-ASCII code points as hexadecimal references. Results are encoded from the original input in one pass, so generated references are not encoded again. Inputs are limited to 100 KiB. The named-reference table is loaded only when decoding is requested or an entity-shaped candidate is found.

## HTTP Status

Use `::http` with a three-digit code or exact reason phrase, or enter `http 502` / `status 404`. A bare three-digit number does not match automatically. Reason-phrase lookup ignores case and repeated whitespace but requires an exact phrase. The checked-in table follows the [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml), checked on 2026-10-15. It includes 104 as a temporary registration that expires on 2026-11-13.

Caching guidance distinguishes statuses that are heuristically cacheable by default from those that need explicit freshness; the response method and headers still apply. Retry guidance is conditional: follow `Retry-After` when relevant, use bounded backoff, and retry only safe/idempotent work or work protected by an idempotency key. A status alone does not make a retry safe. The [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and [HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) specifications define these rules.

## chmod Calculator

Use `::chmod` with a three- or four-digit octal mode (`755`, `0644`, `4755`), a nine-character symbolic mode (`rwxr-xr-x`, `rwsr-xr-x`, `rwxrwxrwt`), or absolute assignments (`u=rwx,g=rx,o=rx`). An optional leading file-type character in a symbolic mode is validated and shown separately. The output includes octal and symbolic forms, user/group/other assignments, special-bit states, and a copyable `chmod MODE <file>` command.

Relative changes such as `u+x` are rejected because they need a known starting mode. Use `::umask=022` to calculate new-file permissions from `0666` and new-directory permissions from `0777`; only permission-bit masks from `000` through `777` are accepted. Inputs are limited to 64 characters.
