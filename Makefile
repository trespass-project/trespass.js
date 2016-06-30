nodeModulesDir = ./node_modules
npmBinDir = $(nodeModulesDir)/.bin
jsSourceDir = ./src
testsDir = ./test


.PHONY: test
test:
	$(npmBinDir)/ava $(testsDir)
	# $(npmBinDir)/ava -v $(testsDir)


.PHONY: test-watch
test-watch:
	$(npmBinDir)/ava --watch $(testsDir)
	# $(npmBinDir)/ava -v --watch $(testsDir)


.PHONY: lint
lint:
	$(npmBinDir)/eslint $(jsSourceDir)


.PHONY: build
build:
	babel --source-maps -d ./dist $(jsSourceDir)
