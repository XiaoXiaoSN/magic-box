/// <reference types="vite/client" />

const env = {
  TOOLBOX: import.meta.env.VITE_TOOLBOX ?? 'https://tool.10oz.tw',

  SENTRY_DSN: 'https://b695bfd011d8dc591cde6ca368f362e7@o510009.ingest.us.sentry.io/4509526138224640',
};

export default env;
