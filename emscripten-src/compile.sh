#!/bin/bash

suffix=so
if [ `uname -s` == "Darwin" ]; then
	suffix=dylib
fi

EMCC_FAST_COMPILER=1 emcc \
  -O2 \
  --memory-init-file 0 \
  -s ASM_JS=1 \
  -s VERBOSE=1 \
  -s ERROR_ON_UNDEFINED_SYMBOLS=1 \
  -s NO_BROWSER=1 \
  -s INVOKE_RUN=0 \
  -s NO_EXIT_RUNTIME=1 \
  -s MODULARIZE=0 \
  -s EXPORTED_FUNCTIONS="`< test-exports.json`" \
  -Ibuild/js/root/include \
  -Lbuild/js/root/lib \
  --post-js test.js \
  build/js/root/lib/libogg.$suffix \
  build/js/root/lib/libopus.$suffix \
  build/js/root/lib/libopusdec.$suffix \
  test.c \
  -o build/test.js

#  --pre-js module-pre.js \

sed -i 's/require("fs")/null/g' build/test.js

#  -s EXPORT_NAME="'TestModule'" \
#  -s NO_FILESYSTEM=1 \
#  build/js/root/lib/liboggz.$suffix \
#  build/js/root/lib/libskeleton.$suffix \
#  --js-library src/ogv-demuxer-callbacks.js \
