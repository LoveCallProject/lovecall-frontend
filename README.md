# LoveCall

TODO


## License

* GPLv3+ (see the `COPYING` file for the full text)


## Hacking

```sh
# install build and dev tools
npm install -g bower webpack webpack-dev-server

# install local deps
# material-design-icons is *large*, please be patient and/or have enough free
# space on disk
npm install
bower install

# to build
webpack   # -p for production build

# to fire up the dev server
webpack-ddev-server --inline --compress --content-base=public/
```
