/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var path = require('path');
var webpack = require('webpack');
var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');


module.exports = {
  resolve: {
    root: [path.join(__dirname, "bower_components")]
  },
  plugins: [
    new webpack.ResolverPlugin(
        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"])
    ),
    new ngAnnotatePlugin({
      add: true
    })
  ],

  entry: "./src/js/main.js",
  output: {
    path: path.join(__dirname, 'build'),
    filename: "bundle.js"
  },
  module: {
    loaders: [
      { test: /\.scss$/, loader: "style!css!sass" },
      { test: /\.css$/, loader: "style!css"}
    ]
  }
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
