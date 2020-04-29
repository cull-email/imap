.PHONY: clean pretty lint test coverage watch

clean:
	rm -rf ./build
	rm -rf ./coverage
	rm -rf ./.nyc_output

# https://prettier.io
pretty:
	npx prettier "src/**/*.ts" --write

# https://palantir.github.io/tslint/
lint:
	npx tslint --fix --project .

build: clean pretty lint
	make -j 2 build/main build/module

# CommonJS
build/main:
	npx tsc -p tsconfig.json

# ES6 Module
build/module:
	npx tsc -p tsconfig.module.json

test:
	npx nyc ava

watch:
	npx tsc -p tsconfig.json -w & npx ava -w && kill $!

coverage:
	npx nyc --reporter=html ava
	open coverage/index.html
