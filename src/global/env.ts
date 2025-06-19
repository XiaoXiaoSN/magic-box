/// <reference types="vite/client" />

const env = {
  TOOLBOX_URL: import.meta.env.VITE_TOOLBOX_URL ?? 'https://tool.10oz.tw',
  SHORTEN_URL: import.meta.env.VITE_SHORTEN_URL ?? 'https://10oz.tw',

  SENTRY_DSN: 'https://b695bfd011d8dc591cde6ca368f362e7@o510009.ingest.us.sentry.io/4509526138224640',
};

export default env;
