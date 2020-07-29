import * as wasm from "../filecoin-signing-tools/signer-npm/pkg/browser/filecoin_signer_wasm.js";

function log(text) { document.getElementById("output").innerHTML += text + "\n"; }

var jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJyZWFkIiwid3JpdGUiLCJzaWduIiwiYWRtaW4iXX0.K5OtvjgSNLsAQfGtnU-SHI-6BDwAiovXAxJxYKOYfQo"

//////////////////////////////////////////////////
// Get the next nonce for "from" addresss
//////////////////////////////////////////////////
function fGetNextNonce(from_addr) {
  log(`<h3>Next nonce for ${from_addr}</h3>`)
  log("Curl for next nonce for address " + from_addr + "\n");
  log(`  curl --silent -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${jwtToken}" --data '{ "jsonrpc": "2.0", "method": "Filecoin.MpoolGetNonce", "params": ["${from_addr}"], "id": 999}' 'http://lotus1:1234/rpc/v0' | jq ".result"`);
}

//////////////////////////////////////////////////
// Create a payment channel ("to" -> "from")
//////////////////////////////////////////////////
function fCreatePCh(to_addr,from_addr,from_key_hex,from_addr_nonce,amtInAttoFilAsString) {
  let createPChUnsignedMsgJsVal = wasm.createPymtChan(from_addr,to_addr,amtInAttoFilAsString,from_addr_nonce);
  log("<h3>wasm.create_payment_channel</h3>");
  log("<b>Unsigned message:</b> " + JSON.stringify(createPChUnsignedMsgJsVal));

  let signedMsgJsVal = wasm.transactionSignLotus(createPChUnsignedMsgJsVal, from_key_hex);
  log("<b>Signed message:</b> " + signedMsgJsVal);

  log("\n<b>Step 1</b> Generated curl to create a payment channel:\n")
  log("  curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: Bearer "+jwtToken+"\" --data '{ \"jsonrpc\": \"2.0\", \"method\": \"Filecoin.MpoolPush\", \"params\": ["+signedMsgJsVal+"], \"id\": 999}' 'http://lotus1:1234/rpc/v0'")
  log("\n<b>Step 2</b> Find its receipt: " + `lotus state search-msg bafy2bzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | grep "Return" | sed -e 's/Return://'`);
  log("\n<b>Step 3</b> Decode receipt for paych. address:  <a href=\"https://github.com/mgoelzer/pchmarshaller\">github.com/mgoelzer/pchmarshaller</a>");
}

/////////////////////////////////
// Create a voucher
/////////////////////////////////
function fCreateVoucher(pch_addr) {
  log("<h3>wasm.create_voucher</h3>");
  // TODO
}

var to_addr = "t3rlfjjkpuk5dobydvqf6wqbup6sdi562ejds3bys2neqltx4cyvj4yjfigwyuycy7sizytooopv6rlrfahsya";
var from_addr = "t1jqla4iimaltyewonoljcqu3j4gjmjvhaacelq3q";
var from_key_hex = "0f3f12b34f920aa02a28c821ed825b295282ba6cbdc9a7d0a4260bb450435c51"; // See https://gist.github.com/mgoelzer/eadc3ba7714694b4d875a606c7165ab5
var from_addr_nonce = 1;
var amtWholeFil = "5000000000";

fGetNextNonce(from_addr);

fCreatePCh(to_addr,from_addr,from_key_hex,from_addr_nonce,amtWholeFil);

fCreateVoucher(pch_addr)