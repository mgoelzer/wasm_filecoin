
## go-lotus Payment Channels Code Notes

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
                                    
                                    sig = sign with from_addr (whoever created pch) over [entire SignedVoucher struct except Signature=nil]
                                    sv = {pch_addr,amount,lane,nonce,sig}

                                    _ = a.PaychMgr.AddVoucher(pch_addr,sv)
                                        {
                                            if ! paychMgr.CheckVoucherValid(pch_addr,sv) return;

                                            ci = getChannelInfo(pch_addr)

                                            laneState = laneState(pch_addr, sv.Lane) else return

                                            ci.Vouchers = append(ci.Vouchers, &VoucherInfo{
                                                Voucher: sv,
                                                Proof:   proof,
                                            })

                                            if ci.NextLane <= (sv.Lane) {
                                                ci.NextLane = sv.Lane + 1
                                            }
                                        }
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
                                {
                                        enc, err := actors.SerializeParams(&paych.UpdateChannelStateParams{
                                            Sv: *sv,
                                        })

                                    	msg := &types.Message{
                                        From:     ci.Control,
                                        To:       ch,
                                        Value:    types.NewInt(0),
                                        Nonce:    nonce,
                                        Method:   builtin.MethodsPaych.UpdateChannelState,
                                        Params:   enc,
                                        GasLimit: 100000,
                                        GasPrice: types.NewInt(0),
                                    }

                                }
                            wait for mcid
                            if exitcode==0, print success messsage and done
                        }
```
