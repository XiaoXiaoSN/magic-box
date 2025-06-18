/// <reference types="vite/client" />

const env = {
  TOOLBOX: import.meta.env.VITE_TOOLBOX ?? 'https://tool.10oz.tw',
};

export default env;
