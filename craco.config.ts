import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

export default {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@functions': path.resolve(__dirname, 'src/functions'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@pages': path.resolve(__dirname, 'src/pages'),
    },
    plugins: [
      new BundleAnalyzerPlugin({
        openAnalyzer: false,
      }),
    ],
  },
};
