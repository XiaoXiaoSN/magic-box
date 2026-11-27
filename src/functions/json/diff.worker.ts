import { compareJson } from './diff';

self.addEventListener(
  'message',
  (event: MessageEvent<{ before: string; after: string }>) => {
    self.postMessage(compareJson(event.data.before, event.data.after));
  },
);
