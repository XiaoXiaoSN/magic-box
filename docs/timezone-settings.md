# Settings and timezone defaults

The default is a fixed UTC+8 offset. The timezone selector offers UTC-12 through
UTC+14 in quarter-hour steps, including UTC+5:30 and UTC+5:45, and an Auto option
that follows the system timezone. Existing numeric `timezoneOffset` preferences
remain valid and migrate to fixed mode.

Auto computes the system offset for the date being converted. It therefore uses
the correct system daylight-saving offset for past/future timestamps, rather than
capturing today's offset once. Now and Timestamp share this date-aware runtime
preference. Fixed mode has no DST adjustments.

Restore all defaults resets appearance, language, input behavior, timezone,
server overrides, privacy, Local AI options, box order, and each source's default
enabled state. It preserves stored input and search history. Clear local data
remains a separate action with its existing confirmation.

## IANA timezone architecture assessment

This change retains numeric offsets and adds `timezoneMode: fixed | system`.
The runtime's `getTimezoneOffset(date)` is the conversion boundary for time boxes.
A future named-zone mode can add a validated `timezoneId` (such as Asia/Taipei or
America/New_York) and resolve its offset for each date using Intl.DateTimeFormat.
That mode must preserve fixed-offset migration, validate unsupported identifiers,
and test both DST transitions and fractional offsets. Converting wall times back
to instants also needs an explicit policy for DST gaps and ambiguous repeated
hours. The current feature follows the system IANA zone via Date; it does not
claim to implement a separate arbitrary-IANA selector.
