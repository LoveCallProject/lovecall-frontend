# LoveCall

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
```
