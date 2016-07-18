# about

`trespass.js` is the core library used in the node.js or web-based tools in the [TREsPASS project](https://www.trespass-project.eu/).

<!-- TODO: list submodules -->


## installation

```
# at the moment:
git checkout [repo-url] trespass.js
cd trespass.js
npm install
npm link

# in the future:
npm install trespass.js
```


## documentation

to generate the documentation, run:

```
make docs && open ./docs/index.html
```



## development

when using the package `npm link`ed, don't forget to run `make build-watch`.
