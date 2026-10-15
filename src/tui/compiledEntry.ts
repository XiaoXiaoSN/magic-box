process.env.DEV = 'false';
process.env.NODE_ENV = 'production';

import './embeddedWasm';
await import('./index');
