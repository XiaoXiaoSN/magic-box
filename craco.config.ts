import * as path from 'path';

export default {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@functions': path.resolve(__dirname, 'src/functions'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@pages': path.resolve(__dirname, 'src/pages'),
    },
  },
};
