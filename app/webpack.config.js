import path from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: path.resolve(__dirname, 'src', 'app.js'),
    output: {
      filename: 'js/bpmn-bundle.min.js',
      path: path.resolve(__dirname, '..', 'plugin', 'assets'),
      clean: false
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          test: /\.bpmn$/,
          type: 'asset/source'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/bpmn-bundle.min.css'
      })
    ],
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'source-map',
    externals: {},
    performance: {
      hints: false
    }
  };
};