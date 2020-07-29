# Javascript Example using Rust WASM Payment Channel Functions

Clone these two repos in side-by-side directories:
 - https://github.com/mgoelzer/wasm_filecoin 
 - https://github.com/mgoelzer/filecoin-signing-tools/

```
├── wasm_filecoin/
│   ├── README.md
│   └── ...
│   
└── filecoin-signing-tools/
    └── ...
```

## Build the Rust code

```
cd filecoin-signing-tools
make
```

## Build and run the wasm code

```
cd wasm_filecoin
npm run-script certificate   # one time only
npm run-script build
npm run-script start
```

## To experiment

#### Modifying the Rust code

```
cd filecoin-signing-tools
vi signer/src/...
vi signer-npm/src/...
```

then `make` from the root directory (as above).

