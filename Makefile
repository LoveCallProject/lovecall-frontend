all: webpack

webpack:
	@./node_modules/.bin/webpack -p --devtool='#sourcemap'

.PHONY: webpack
