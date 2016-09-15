# about

`trespass.js` is the core library used in the node.js or web-based tools developed for the [TREsPASS project](https://www.trespass-project.eu/).

modules:
- `trespass.model`
- `trespass.attacktree`
- `trespass.analysis`
- `trespass.api`
- `trespass.utils`


## installation

```
npm install trespass.js
```


## documentation

to generate the documentation, run:

```
make docs && open ./docs/index.html
```


## development

when using the package `npm link`ed, don't forget to run `make build-watch`.


## tests

```
make test
```
