#!/bin/bash

dir=`pwd`

# set up the build directory
mkdir -p build/js/root
mkdir -p build/js/libopus
cd build/js/libopus
  
# finally, run configuration script
emconfigure ../../../vendored/libopus/configure --disable-asm --disable-oggtest --disable-doc --disable-extra-programs --prefix="$dir/build/js/root"

# compile libopus
emmake make -j8
emmake make install

cd ../../..
