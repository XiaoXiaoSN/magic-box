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
