#!/bin/sh
exec webpack-dev-server --inline --compress --content-base=public/ --devtool='#cheap-module-eval-source-map' $@
