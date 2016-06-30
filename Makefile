nodeModulesDir = ./node_modules
npmBinDir = $(nodeModulesDir)/.bin
jsSourceDir = ./src
testsDir = ./test
buildDir = ./dist


.PHONY: test
test:
	$(npmBinDir)/ava $(testsDir)


.PHONY: test-watch
test-watch:
	$(npmBinDir)/ava --watch $(testsDir)


.PHONY: lint
lint:
	$(npmBinDir)/eslint $(jsSourceDir)


.PHONY: build
build:
	babel --source-maps -d $(buildDir) $(jsSourceDir)
