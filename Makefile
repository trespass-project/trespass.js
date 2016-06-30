nodeModulesDir = ./node_modules
npmBinDir = $(nodeModulesDir)/.bin
jsSourceDir = ./src
testsDir = ./test
buildDir = ./dist
babelOptions = --source-maps -d $(buildDir) $(jsSourceDir)


.PHONY: test
test:
	$(npmBinDir)/ava $(testsDir)


.PHONY: test-watch
test-watch:
	$(npmBinDir)/ava --watch $(testsDir)


.PHONY: lint
lint:
	$(npmBinDir)/eslint $(jsSourceDir)


.DEFAULT_GOAL = build
.PHONY: build
build:
	rm -rf $(buildDir)
	babel $(babelOptions)


.PHONY: build-watch
build-watch:
	rm -rf $(buildDir)
	babel --watch $(babelOptions)
