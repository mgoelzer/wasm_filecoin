# Payment Channel Extensions to [filecoin-signing-tools](https://github.com/Zondax/filecoin-signing-tools)

This is a demonstration repo for the Payment Channel (PCH) exntensions to Zondax's rust-filecoin-signer being developed in [this temporary fork of filecoin-signing-tools](https://github.com/mgoelzer/filecoin-signing-tools).  This repo shows how to compile and run the Wasm code in a browser, but does not do anything useful.

- [Development Status](#development-status)
- [Build and Run](#build-and-run)
- [How to Add More Payment Channel Functions](#how-to-add-more-payment-channel-functions)
- [How to Add More Payment Channels Functions to filecoin-signing-tools](#how-to-add-more-payment-channels-functions-to-filecoin-signing-tools)
- [Contributing](#contributing)
- [Possibly Useful Tools](#possible-useful-tools)

## Developmennt Status

> Legend: :green_apple: Done &nbsp; :lemon: In Progress &nbsp; :tomato: Not started

| **Payment Channels (PCH)**                   |  API Demonstrated  | Comment                           |
| -------------------------------------------- | :----------------: | :-------------------------------: | 
| Create PCH                                   |   :green_apple:    |                                   | 
| Update PCH State                             |     :tomato:       |                                   | 
| Settle PCH                                   |     :tomato:       |                                   | 
| Collect PCH                                  |     :tomato:       |                                   | 

| **Payment Vouchers**                         |  API Demonstrated  | Comment                           |
| -------------------------------------------- | :----------------: | :-------------------------------: | 
| Create Voucher                               |     :tomato:       |                                   | 
| Verify Voucher                               |     :tomato:       |                                   | 
| Add Voucher to PCH                           |     :tomato:       |                                   | 
| Submit Best-spendable Voucher                |     :tomato:       |                                   | 

## Build and Run

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

### Build the Rust code

```
cd filecoin-signing-tools
make
```

### Prepare and Run the Wasm Code

```
cd wasm_filecoin
npm run-script certificate   # one time only
npm run-script build
npm run-script start
```

Browse to [https://localhost:8080/](https://localhost:8080/)

### To experiment

#### Modifying the Rust code

```
cd filecoin-signing-tools
vi signer/src/...
vi signer-npm/src/...
```

then `make` from the root directory (as above).

## How to Add More Payment Channel Functions      

### go-lotus Payment Channels Flow

![Diagram](/pch-diagram.png)

In the normal case:

1.  Payer (green) creates the payment channel (PCH).

2.  Payer (green) then creates a voucher and passes it to the payee (blue)

3.  Payee (blue) checks it and adds it to the list of vouchers for the lane being used.

4.  The cycle can continue as many times as necessary.  At some point, payer (green) calls Settle.

5-6.  Payee (blue) now has ~12 hours to Submit its best voucher before the channel can be Collected.

The above diagram illustrates the general PCH concept under "normal" retrieval circumstances.  For a complete description of the retrieval client and provider state machines, see [go-fil-markets/retrievalmarket](https://github.com/filecoin-project/go-fil-markets/tree/master/retrievalmarket).

### Code Notes

The notes below describe what Lotus is doing at each step mentioned above.

**Payment Channels**

```
  * Create          from,to,amt
  * Settle          pch_addr
                        {
                            smsg_cid = api.PaychSettle(pch_addr)
                                {
                                    ci := a.PaychMgr.GetChannelInfo(pch_addr)
                                    smsg_cid = MPoolPushMessage Message{
                                        To:  pch_addr,
                                        From:  ci.Control,
                                        Value:  0,
                                        Method:  builtin.MethodsPaych.Settle
                                    }                                    
                                }
                            wait for smsg_cid
                            if exitcode==0, print success messsage and done
                        }
  * Collect          pch_addr
                        {
                            mcid = api.PaychCollect(pch_addr)
                                {
                                    ci := a.PaychMgr.GetChannelInfo(pch_addr)
                                    smsg_cid = MPoolPushMessage Message{
                                        To:  pch_addr,
                                        From:  ci.Control,
                                        Value:  0,
                                        Method:  builtin.MethodsPaych.Collect
                                    }
                                    return smsg_cid
                                }
                            wait for smsg_cid on chain
                            if exitcode==0, print success messsage and done
                        }
```

**Payment Vouchers**

```
  * Create          pch_addr, amount, lane(=0)
                        {
                            sv *paych.SignedVoucher = api.PaychVoucherCreate(pch_addr,amount,lane)
                                {
                                    nonce = api.PaychMgr.NextNonceForLane(pch_addr,lane)
                                    sv = {pch_addr,amount,lane,nonce,sig}
                                    _ = a.PaychMgr.AddVoucher(pch_addr,sv)
                                    return sv
                                }
                            enc = EncodedString(sv)
                                {
                                    - sv marshalls itself into cbor bytes
                                    - those bytes are encoded to unpadded base64
                                }
                        }
  * CheckValid      pch_addr, voucher_str
                        {
                            sv = [decoded version of voucher_str]
                            err = api.PaychVoucherCheckValid(ch, sv)
                            voucher is valid UNLESS err
                        }
  * Add             pch_addr, voucher_str
                        {
                            sv *paych.SignedVoucher = [decoded string version of voucher from Create]
                            _ = api.PaychVoucherAdd(pch_addr, sv, proof []byte = NIL, minDelta big.Int = 0)
                        }
  * Submit          pch_addr, voucher_str
                        {
                            // Lotus breaks this BestSpendable as a separate API call
                            func BestSpendable() -> types.SignedVoucher {
                                vouchers = api.PaychVoucherList(pch_addr)
                                for v in vouchers {
                                    api.PaychVoucherCheckSpendable(pch_addr, v, unused, unused)
                                    if v is larger than previous best spendable:
                                        v is now the best spendable
                                }
                            }
                            sv = bestSpendable()
                            mcid = api.PaychVoucherSubmit(pch_addr, sv)
                            wait for mcid
                            if exitcode==0, print success messsage and done
                        }
```

### How to Add More Payment Channels Functions to `filecoin-signing-tools`

- Capture the bytes on the wire generated by Lotus for test vectors you can use in your `#[test]` routines

#### [`../filecoin-signing-tools/extras/src/lib.rs`](https://github.com/mgoelzer/filecoin-signing-tools/blob/master/extras/src/lib.rs)
 - Copy/adapt `pub struct PymtChanCreateParams` if you have a constructor params marshalled inside your encoded Params structure

#### [`../filecoin-signing-tools/signer/src/lib.rs`](https://github.com/mgoelzer/filecoin-signing-tools/blob/master/signer/src/lib.rs)
 - Add a `#[test]` function like `payment_channel_creation_secp256k1_signing()`
 - Create `signer/src/lib.rs` analog of create_pymtchan called e.g. `update_pymtchan_chan_state`

#### [`../filecoin-signing-tools/signer/src/api.rs`](https://github.com/mgoelzer/filecoin-signing-tools/blob/master/signer/src/api.rs)
 - Copy/adapt `struct PaymentChannelCreateParams` and `TryFrom` directly below it.  PaymentChannelCreateParams corresponds to `PymtChanCreateParams`
 - Copy/adapt `struct MessageParamsPaymentChannelCreate` and the `TryFrom` directly below it. MessageParamsPaymentChannelCreate is the outer Params for your message.
 - Add 1 or 2 elements to `enum MessageParams` for your analogs of `PaymentChannelCreateParams` and `MessageParamsPaymentChannelCreate`
 - Add 1 or 2 blocks to `MessageParams:serialize()` to serialize your analogs of `PaymentChannelCreateParams` and `MessageParamsPaymentChannelCreate`

#### [`../filecoin-signing-tools/signer-npm/src/lib.rs`](https://github.com/mgoelzer/filecoin-signing-tools/blob/master/signer-npm/src/lib.rs)
 - Create a `create_pymtchan`-like function here that is callable from js as wasm:
```
#[wasm_bindgen(js_name = createPymtChan)]
pub fn create_pymtchan() {}
```

#### [`index.js`](index.js)
 - Call you new `signer-npm/src/lib.rs`:`create_pymtchan()` from your `index.js`

### Contributing

The purpose of this repo (and its [sister repo](https://github.com/mgoelzer/filecoin-signing-tools/)) are to prepare a reusable, Javascript/Rust library for creating and manipulationg Filecoin payment channels without relying on Lotus.  This code will either become a crate that runs on top of Zondax's [filecoin-signing-tools](https://github.com/Zondax/filecoin-signing-tools/) or be merged into Zondax's library.

The issues in this repo describe the work remaining to provide sufficient Filecoin payment channel to support to enable a retrieval network of browser-based clients.

### Possibly Useful Tools

#### [github.com/mgoelzer/lotus#hex_instrumented](https://github.com/mgoelzer/lotus/tree/hex_instrumented)

The [`hex_instrumented` branch of github.com/mgoelzer/lotus (fork)](https://github.com/mgoelzer/lotus/tree/hex_instrumented) will fmt.Printf() the actual messages being sent to the chain.  Useful for generating test vectors.