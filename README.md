# mempool·watch

A browser-native view of the Bitcoin **mempool** — the third sibling, after
[block·health](https://bitcoin-kernel.com/health/) and [fork·watch](https://bitcoin-kernel.com/forks/).

The mempool is different from everything the other two sites watch: it has **no proof-of-work**,
so it cannot be verified — only *witnessed*. This page is built around that honesty:

1. **Witnesses are compared, not trusted.** Pending-tx counts, sizes and fees from independent
   public sources (mempool.space, blockstream.info) side by side, with drift surfaced.
2. **Bytes are verified where bytes exist.** Every transaction the page inspects is fetched raw
   and re-hashed — a claimed txid whose bytes don't match is flagged, not displayed as fact.
   Incoming OP_RETURN datacarrier is classified against the historical 80/83-byte standard.
3. **Consensus settles the argument.** The one thing a mempool view can be *checked against* is
   the chain itself: every mined block's txids are compared with the public mempool view that
   preceded it. Transactions mined without ever appearing publicly are **dark transactions** —
   the signature of out-of-band submission — tallied per pool, from your own observations.

## Dark-transaction method (and its limits)

A full txid snapshot of the public mempool is taken every 2 minutes (~3–5 MB, toggleable),
merged with a live sample stream. When a block arrives, its txids (coinbase excluded) are
checked against everything seen before it. The result is an **upper bound**: a tx broadcast in
the final seconds before its block counts as unseen. Blocks arriving with a stale baseline are
recorded without a measurement rather than guessed at. The per-pool table needs days of
watching before percentages mean much — it is a sample from your browser, not a census.

## Roadmap

- **WS-to-TCP bridge to a real node** — the vendored engine already carries the P2P codec
  (`engine/codec/p2p.js`, `ws.js`); pointing the page at a user-supplied bridge (config-only,
  like the siblings' `?peer=` links — never a server in the repo) gives an *independent*
  mempool witness instead of explorer APIs, and real-time tx arrival.
- Cross-correlation with fork·watch's miner league: pools' dark-tx rates vs their
  datacarrier-inclusion policies.
- Mesh gossip of observed txids between mempool·watch browsers, so the baseline is the swarm's
  union view rather than one browser's.

## Layout

```
index.html   the app: witnesses, fee histogram, datacarrier stream, dark-tx ledger
tx-scan.js   pure helpers: OP_RETURN standardness, coinbase tag → pool attribution
engine/      vendored bitcoin-kernel codec + JSON-LD consensus schemas
tests/       node test suite
```

## Run locally

```
python3 -m http.server 8901    # then open http://localhost:8901/
node tests/test-tx-scan.mjs
```

No build step, no backend — static files on GitHub Pages.

## License

AGPL-3.0-or-later. Copyright © 2026 Melvin Carvalho. See [LICENSE](LICENSE).

Includes vendored code from [bitcoin-kernel](https://github.com/bitcoin-kernel/kernel), also AGPL-3.0.
