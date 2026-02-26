<p align="center">
  <img src="docs/banner.png" alt="ClawShield" width="100%" />
</p>

<p align="center">
  <strong>Private shielded transactions for OpenClaw / AI agents on Solana.</strong>
</p>

<p align="center">
  <a href="https://clawshield.network"><img src="https://img.shields.io/badge/live-clawshield.network-9945FF?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIvPjwvc3ZnPg==" alt="Live" /></a>
  <a href="#supported-tokens"><img src="https://img.shields.io/badge/tokens-SOL%20·%20USDC%20·%20USDT-14F195?style=flat-square" alt="Tokens" /></a>
  <a href="https://github.com/Privacy-Cash/privacy-cash"><img src="https://img.shields.io/badge/protocol-Privacy%20Cash-white?style=flat-square" alt="Protocol" /></a>
  <a href="#security"><img src="https://img.shields.io/badge/audited-4%20firms-00D18C?style=flat-square" alt="Audited" /></a>
  <a href="#"><img src="https://img.shields.io/badge/solana-mainnet--beta-black?style=flat-square&logo=solana" alt="Solana" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
</p>

<br />

## The Problem

OpenClaw / AI agents can **receive** money on Solana. But when they need to **send** funds, every transaction is publicly linked to their wallet. There's no privacy, no anonymity — every payment is traceable on-chain.

**ClawShield** gives agents the ability to send private, shielded transactions using Zero-Knowledge proofs. Deposits and withdrawals are cryptographically unlinkable. No one can trace which deposit funded which withdrawal.

<br />

## How It Works

```
┌─────────────┐     1. Request unsigned tx     ┌──────────────┐
│             │ ──────────────────────────────►│              │
│   AI Agent  │     2. Return unsigned tx      │  ClawShield  │
│  (keys stay │ ◄──────────────────────────────│    Server    │
│   local)    │     3. Sign locally, submit    │              │
│             │ ──────────────────────────────►│   ┌──────┐   │
└─────────────┘     4. Relay to Solana         │   │ ZK   │   │
                                               │   │Proof │   │
                    5. Funds arrive privately  │   └──────┘   │
                    (unlinkable to deposit)    └──────┬───────┘
                                                      │
                                                      ▼
                                                 ┌──────────┐
                                                 │  Solana  │
                                                 │ mainnet  │
                                                 └──────────┘
```

**Three steps. No key exposure. Full anonymity.**

1. **Agent requests** — calls the API with its pubkey and amount
2. **Agent signs locally** — private key never leaves the agent's environment
3. **Relay submits** — transaction goes to Solana through our relay (IP anonymity)

<br />

## Install as an OpenClaw Skill

```bash
curl -sL https://clawshield.network/skill.md -o skills/claw-shield.md
```

Or fetch the skill definition directly:

```bash
curl -sL https://clawshield.network/skill.md
```

That's it. Your agent can now shield and withdraw SOL, USDC, and USDT privately.

<br />

## API Endpoints

All endpoints are served from `https://clawshield.network/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shield` | Build unsigned deposit transaction |
| `POST` | `/api/withdraw` | Execute withdrawal with ZK proof |
| `POST` | `/api/balance` | Query shielded balance |
| `POST` | `/api/submit` | Relay signed transaction to Solana |
| `GET`  | `/api/status` | Health check |

### Shield (Deposit)

```bash
curl -X POST https://clawshield.network/api/shield \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey": "<solana-pubkey>",
    "amount": 0.1,
    "token": "SOL",
    "signature": "<hex-signature>"
  }'
```

```json
{ "unsignedTx": "<base64>", "token": "SOL", "amount": 0.1, "baseUnits": 100000000 }
```

### Withdraw

```bash
curl -X POST https://clawshield.network/api/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "pubkey": "<solana-pubkey>",
    "amount": 0.1,
    "token": "SOL",
    "recipient": "<destination-address>",
    "signature": "<hex-signature>"
  }'
```

```json
{ "tx": "<tx-hash>", "token": "SOL", "amount": 0.1, "fee_in_lamports": 6350000 }
```

The recipient receives `amount - fee` with **no on-chain link** to the original deposit.

### Balance

```bash
curl -X POST https://clawshield.network/api/balance \
  -H "Content-Type: application/json" \
  -d '{ "pubkey": "<solana-pubkey>", "token": "SOL", "signature": "<hex-signature>" }'
```

```json
{ "balance": 0.5, "token": "SOL", "lastUpdated": 1709000000000 }
```

<br />

## Supported Tokens

| Token | Symbol | Mint | Decimals |
|-------|--------|------|----------|
| Solana | `SOL` | Native | 9 |
| USD Coin | `USDC` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| Tether | `USDT` | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |

<br />

## Fees

| | Deposit | Withdrawal |
|---|---------|------------|
| **Rate** | Free (0%) | 0.35% + flat rent |
| **SOL rent** | — | 0.006 SOL |
| **USDC rent** | — | 0.60 USDC |
| **USDT rent** | — | 0.60 USDT |
| **Minimum** | Any amount | 0.01 SOL / 2 USDC / 2 USDT |

> `fee = amount × 0.0035 + rent_fee`

<br />

## Project Structure

```
clawshield/
├── app/
│   └── api/
│       ├── shield/route.ts      # Build unsigned deposit tx
│       ├── withdraw/route.ts    # ZK proof withdrawal
│       ├── balance/route.ts     # Query shielded balance
│       ├── submit/route.ts      # Relay signed tx to Solana
│       └── status/route.ts      # Health check
├── lib/
│   ├── constants.ts             # Token configs, RPC, circuit paths
│   └── privacy-cash.ts          # Connection singleton, helpers
├── public/
│   └── skill.md                 # OpenClaw skill definition
└── package.json
```

<br />

## Security

| Pillar | Detail |
|--------|--------|
| **Keys Never Leave** | Private keys stay in the agent. Server only sees pubkeys. Transactions are signed locally. |
| **Zero-Knowledge Proofs** | Deposits and withdrawals are cryptographically unlinkable using ZK-SNARKs. |
| **IP Anonymity** | The `/api/submit` relay decouples the agent's IP from the on-chain transaction. |
| **Audited Protocol** | Built on [Privacy Cash](https://github.com/Privacy-Cash/privacy-cash) — audited by **Accretion**, **HashCloak**, **Zigtur**, and **Kriko**. |

<br />

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Next.js 16 (App Router) |
| Chain | Solana mainnet-beta |
| ZK Proofs | Privacy Cash SDK + WASM circuits |
| Hashing | Light Protocol `hasher.rs` (WASM) |
| Language | TypeScript (strict) |

<br />

## Self-Hosting

```bash
git clone https://github.com/ClawShield/clawshield.git
cd clawshield
cp .env.example .env.local
npm install
npm run dev
```

Set your `SOLANA_RPC_URL` in `.env.local` — the public Solana RPC works but a dedicated endpoint is recommended for production.

<br />

## License

MIT — see [LICENSE](LICENSE)

<br />

---

<p align="center">
  <sub>Built on <a href="https://github.com/Privacy-Cash/privacy-cash">Privacy Cash</a> · Powered by <a href="https://solana.com">Solana</a> · Designed for <a href="https://openclaw.ai">OpenClaw</a> agents</sub>
</p>