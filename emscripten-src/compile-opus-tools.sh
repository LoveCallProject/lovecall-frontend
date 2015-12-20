#!/bin/bash

dir=`pwd`

# set up the build directory
mkdir -p build/js/root
mkdir -p build/js/opus-tools

cd build/js/opus-tools

# finally, run configuration script
PREFIX_CFLAGS="-I${dir}/build/js/root/include"
export OGG_CFLAGS="${PREFIX_CFLAGS}"
export OGG_LIBS="-logg"
export OPUS_CFLAGS="${PREFIX_CFLAGS}/opus"
export OPUS_LIBS="-lopus"
emconfigure ../../../vendored/opus-tools/configure --disable-oggtest --disable-opustest --without-flac --prefix="$dir/build/js/root"

# compile libopus
emmake make -j8
emmake make install

cd ../../..
