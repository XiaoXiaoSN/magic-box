# Text Diff

Enter the first text followed by `::diff` on a separate line. Paste the second
text into the Diff box and press Compare. Copy diff copies the current result.
Editing the second text clears the previous result until you compare again.
The Expand button opens a larger comparison workspace.

Use `::lang=json`, `::language=yaml`, or `::l=xml` to highlight the original text.
The comparison uses diff highlighting. Comparisons run locally, with a combined
20,000-character limit and 2,000 lines per side. Literal `---` lines remain content
when using the two-input interface.

The existing `::textdiff` and `::linediff` directives still compare two texts
separated by a line containing only `---` in the main input.

Use `::jsondiff` to compare two JSON documents in the same workspace. The
result lists changes by JSON Pointer with before and after values. Object key
order and formatting are ignored. Numbers with equal values such as `1` and
`1.0` compare equal without rounding large integers. Arrays compare by index.
The combined limit is 20,000 characters. The comparison runs in a cancellable
browser worker. Download JSON Patch exports the operations needed to transform
the original document into the second document.

To compare from the terminal, separate the two documents with a line containing
only `---`, then append `::jsondiff` for changes or `::jsondiff=patch` for JSON Patch.
