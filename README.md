# LoveCall

[![devDependency Status](https://david-dm.org/LoveCallProject/lovecall-frontend/dev-status.svg)](https://david-dm.org/LoveCallProject/lovecall-frontend#info=devDependencies)

TODO


## License

* GPLv3+ (see the `COPYING` file for the full text)


## Hacking

```sh
# install build and dev tools
npm install -g bower webpack webpack-dev-server

# install local deps
# material-design-icons is *large*, please be patient and make sure to have
# enough free space
npm install
bower install

# to build
webpack   # -p for production build

# to fire up the dev server
webpack-dev-server --inline --compress --content-base=public/

# invoke webpack with webpack-cordova-plugin enabled (instructions TODO)
BUILD_CORDOVA=1 webpack
```
