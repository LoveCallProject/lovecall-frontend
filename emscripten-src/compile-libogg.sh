#!/bin/bash

dir=`pwd`

# set up the build directory
mkdir -p build/js/root
mkdir -p build/js/libogg
cd build/js/libogg

# finally, run configuration script
emconfigure ../../../vendored/libogg/configure --prefix="$dir/build/js/root"

# compile libogg
emmake make -j8
emmake make install

cd ../../..
