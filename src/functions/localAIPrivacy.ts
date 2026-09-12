// Keep telemetry muted until reload after entering Local AI. Buffered errors,
// breadcrumbs or transactions must not escape when the user switches back.
let privateSession = false;
export function enterLocalAIPrivacy(): void { privateSession = true; }
export function isLocalAIPrivate(): boolean { return privateSession; }
