/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var path = require('path');
var webpack = require('webpack');
var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
var htmlWebpackPlugin = require('html-webpack-plugin');
var CordovaPlugin = require('webpack-cordova-plugin');

var useCordova = (function() {
  var tmp = parseInt(process.env.BUILD_CORDOVA);
  return isNaN(tmp) ? false : tmp !== 0;  // fsck JS
})();


module.exports = {
  resolve: {
    root: [
      path.join(__dirname, 'node_modules'),
      path.join(__dirname, "bower_components"),
    ]
  },
  plugins: [
    new webpack.ExtendedAPIPlugin(),
    new webpack.ResolverPlugin(
        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
    ),
    new ngAnnotatePlugin({
      add: true
    }),
    new htmlWebpackPlugin({
      template: 'public/lovecall.html',
      hash: true,
      inject: 'body',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        caseSensitive: true,
      },
    }),
  ],

  devServer: {
    contentBase: './build',
  },

  entry: "./src/js/main.js",
  output: {
    path: path.join(__dirname, 'build'),
    filename: "assets/bundle.js",
  },
  module: {
    loaders: [
      { test: /\.scss$/, loader: "style!css!sass" },
      { test: /\.css$/, loader: "style!css" },
      { test: /\.tmpl\.html$/, loader: "ng-cache?-conservativeCollapse&-preserveLineBreaks" },
      { test: /\.(jpg|png|woff|woff2|eot|ttf|svg|opus)$/, loader: 'url-loader?limit=100000' },
    ]
  },
};


if (useCordova) {
  module.exports.plugins.push(
    new CordovaPlugin({
      config: 'config.xml',
      src: 'index.html',
      platform: 'android',
      version: true,
    })
  );
}

/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
