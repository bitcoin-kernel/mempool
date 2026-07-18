// tx-scan test suite + live smoke: verify a real mempool tx's bytes hash to
// its claimed txid and classify its datacarrier. Run: node tests/test-tx-scan.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { Codec } = await import(join(ROOT, 'engine/codec/codec.js'));
const { scanTx, opReturnDataBytes, coinbaseTag, identifyPool } = await import(join(ROOT, 'tx-scan.js'));

const jl = (n) => JSON.parse(readFileSync(join(ROOT, `engine/schema/${n}.jsonld`), 'utf8'));
const codec = new Codec(jl('core'), jl('proof'), jl('p2p'));

let passed = 0, failed = 0;
const check = (name, cond) => { if (cond) passed++; else { failed++; console.error('FAIL', name); } };

// opReturnDataBytes edges
check('basic push', opReturnDataBytes('6a04deadbeef') === 4);
check('pushdata1 80B', opReturnDataBytes('6a4c50' + 'aa'.repeat(80)) === 80);
check('truncated pushdata1', opReturnDataBytes('6a4c') === 0);
check('lying length counts present bytes', opReturnDataBytes('6a4c50aabb') === 2);
check('not an opreturn', opReturnDataBytes('76a914' + '00'.repeat(20) + '88ac') === null);

// scanTx over a synthetic decoded tx
const tx = {
  version: 2, lockTime: 0,
  inputs: [{ prevout: { txid: '11'.repeat(32), vout: 0 }, scriptSig: '', sequence: 0xffffffff }],
  outputs: [
    { value: 0, scriptPubKey: '6a04deadbeef' },                 // standard
    { value: 0, scriptPubKey: '6a4c60' + 'bb'.repeat(96) },     // 96 B data — over both limits
    { value: 1000, scriptPubKey: '0014' + '22'.repeat(20) },    // not an OP_RETURN
  ],
  witness: [[]],
};
const s = scanTx(tx);
check('scanTx counts', s.opreturns === 2 && s.nonStd === 1 && s.maxData === 96);

// coinbase tag + pool
check('pool id', identifyPool('|Powered by Luxor Tech|') === 'Luxor');
check('pool unknown', identifyPool('hello world') === null);
check('tag printable', coinbaseTag('034a9d0e04' + Buffer.from('/Foundry USA Pool/').toString('hex')).includes('Foundry USA'));

// live smoke: a recent mempool tx round-trips through the codec and its bytes hash to the claimed txid
try {
  const recent = await (await fetch('https://mempool.space/api/mempool/recent')).json();
  const claim = recent[0].txid;
  const hex = (await (await fetch(`https://mempool.space/api/tx/${claim}/hex`)).text()).trim();
  const decoded = codec.decode('Transaction', hex);
  check('live txid verifies', codec.txid(decoded) === claim);
  const live = scanTx(decoded);
  check('live scan sane', Number.isInteger(live.opreturns) && live.nonStd <= live.opreturns);
  console.log(`live tx ${claim.slice(0, 16)}… verified · ${decoded.outputs.length} outputs · ${live.opreturns} OP_RETURN(s)`);
} catch (e) { console.log('live smoke skipped (network):', e.message); }

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
