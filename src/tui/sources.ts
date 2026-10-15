import { boxSources } from '@modules/boxSources';

// the manifest owns terminal capability policy so the web and TUI cannot drift.
export const tuiBoxSources = boxSources.filter((source) => source.headless);

export default tuiBoxSources;
