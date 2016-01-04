#!/bin/sh

# without this webpack-cordova-plugin will override the content base
export BUILD_CORDOVA=0

exec webpack-dev-server --inline --compress --content-base=public/ --devtool='#cheap-module-eval-source-map' $@
