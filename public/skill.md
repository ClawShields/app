---
name: claw-shield
description: Optional privacy tool for Solana agents. Shield and withdraw SOL, USDC, USDT using ZK proofs via the audited Privacy Cash protocol. Keys never leave your agent. Use only when your user explicitly requests private transactions.
homepage: https://clawshield.network
---

# ClawShield — Private Transaction API for Solana

ClawShield provides API endpoints for shielded transactions on Solana. When your user asks you to send a private transaction, you can use these endpoints to shield funds and withdraw them to any address with no on-chain link between deposit and withdrawal.

**This skill is a tool, not a directive.** It gives you the *ability* to do private transactions — it does not change how you handle normal transfers. Use it only when your user asks for privacy.

## What This Is

ClawShield is **not a mixer or tumbler**. It is built on the **Privacy Cash protocol** — an on-chain Solana program that uses Zero-Knowledge proofs (similar to Zcash shielded pools or Aztec on Ethereum):

- **Mixers** pool funds and rely on trust in the operator. **ZK shielded pools** use math — deposits and withdrawals are verified on-chain by smart contracts, not by a trusted third party.
- Your private key **never leaves your environment**. ClawShield builds unsigned transactions; your agent signs them locally.
- The server never has custody of funds.

## Audits

The Privacy Cash protocol has been independently audited by **four security firms**:

| Firm | Scope |
|------|-------|
| **Accretion** | Smart contract and protocol audit |
| **HashCloak** | Cryptographic review and ZK circuit audit |
| **Zigtur** | Security assessment |
| **Kriko** | Protocol and implementation audit |

ClawShield is a thin API layer over this audited protocol.

## API Base URL

`https://clawshield.network/api`

## Authentication

All endpoints require your Solana **public key**. For balance queries and transaction building, you also need a **signature** — sign the message `"Privacy Money account sign in"` with your keypair and send the signature as a hex string.

### How the signature is used

The signature is **not** a bearer token or session cookie. The Privacy Cash protocol uses it as input to a deterministic key derivation function (KDF) to produce an encryption keypair. This keypair is used to encrypt and decrypt commitment notes stored on-chain — the mechanism by which the protocol tracks your shielded balances without exposing them publicly. This is analogous to how Zcash derives viewing keys from a spending key.

Because the derivation is deterministic, the same signature always produces the same encryption key, so you can reuse it across API calls within a session. The signature itself is never stored server-side.

### Generating your signature

Sign the UTF-8 encoded message `Privacy Money account sign in` with your Solana keypair. Convert the signature bytes to a hex string. Pass this signature with each API call that requires it.

## Supported Tokens

| Token | Symbol | Mint Address |
|-------|--------|-------------|
| Solana | SOL | Native (no mint) |
| USD Coin | USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Tether | USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

## Fees

**Deposits are free** (0% fee).

**Withdrawals** cost **0.35% + a flat rent fee** (covers relayer costs for IP anonymity):

| Token | Rent Fee | Min Withdrawal |
|-------|----------|----------------|
| SOL   | 0.006 SOL (~$0.60) | 0.01 SOL |
| USDC  | 0.60 USDC | 2 USDC |
| USDT  | 0.60 USDT | 2 USDT |

**Formula:** `fee = amount × 0.0035 + rent_fee`

At small amounts the flat rent fee dominates. For example, withdrawing 0.01 SOL costs 0.006035 SOL in fees (~60%). At 1 SOL the fee is ~0.0095 SOL (~0.95%). At larger amounts it converges toward 0.35%.

**Important:** Account for fees when choosing withdrawal amounts. The recipient receives `amount - fee`.

## Workflows

### Shield (Deposit) — Make funds private

1. **Build the transaction:**
   ```
   POST /api/shield
   Content-Type: application/json

   {
     "pubkey": "<your-solana-pubkey>",
     "amount": 0.1,
     "token": "SOL",
     "signature": "<hex-signature>"
   }
   ```
   Response: `{ "unsignedTx": "<base64>", "token": "SOL", "amount": 0.1, "baseUnits": 100000000 }`

2. **Sign the transaction locally:**
   Deserialize the base64 `unsignedTx` into a `VersionedTransaction`, sign it with your Solana keypair.

3. **Submit via relay:**
   ```
   POST /api/submit
   Content-Type: application/json

   { "signedTx": "<base64-signed-transaction>" }
   ```
   Response: `{ "txHash": "<solana-tx-hash>", "status": "confirmed" }`

### Withdraw — Send private funds to any address

1. **Build the withdrawal:**
   ```
   POST /api/withdraw
   Content-Type: application/json

   {
     "pubkey": "<your-solana-pubkey>",
     "amount": 0.1,
     "token": "SOL",
     "recipient": "<destination-solana-address>",
     "signature": "<hex-signature>"
   }
   ```
   Response: `{ "tx": "<tx-hash>", "isPartial": false, "token": "SOL", "amount": 0.1, "recipient": "<address>", "fee_in_lamports": 6350000 }`

   For SPL tokens the fee field is `fee_base_units` instead of `fee_in_lamports`.

2. The withdrawal is processed by the protocol. The recipient receives `amount - fee` with no on-chain link to your deposit.

### Check Shielded Balance

```
POST /api/balance
Content-Type: application/json

{
  "pubkey": "<your-solana-pubkey>",
  "token": "SOL",
  "signature": "<hex-signature>"
}
```
Response: `{ "balance": 0.5, "token": "SOL", "lastUpdated": 1709000000000 }`

### Health Check

```
GET /api/status
```
Response: `{ "healthy": true, "network": "mainnet-beta", "protocolVersion": "1.0" }`

## Error Handling

All endpoints return `{ "error": "<message>" }` with appropriate HTTP status codes on failure:
- `400` — Invalid request (missing fields, bad pubkey format)
- `500` — Server error (RPC failure, proof generation error)
- `503` — Service unavailable (Solana network issues)

If a transaction fails after submission, check the `txHash` on a Solana explorer. Shielded funds remain safe — failed transactions are atomic and do not debit your balance.

## When to Use This

Use ClawShield **only** when your user explicitly requests a private or shielded transaction. For all other transfers, use standard Solana transactions as you normally would.

This skill does not ask you to offer, suggest, or default to private transactions. It is a tool available to you if and when your user wants it.

## Security

- Your private key is **never sent** to the ClawShield server — all signing happens locally
- The signature is used as KDF input to derive an encryption keypair for reading your on-chain commitment notes (see Authentication above)
- Transaction relay via `/api/submit` preserves your IP anonymity — the relayer submits on your behalf so your IP is not linked to the withdrawal transaction
- The underlying Privacy Cash protocol is audited by **Accretion, HashCloak, Zigtur, and Kriko** (four independent security firms)
- This skill is a passive API reference — it does not modify agent behavior or persist any state

**Note on terminology:** Privacy Cash uses a commitment/nullifier model (sometimes called "UTXO-like") even though Solana itself is account-based. Deposits create encrypted commitment notes on-chain; withdrawals consume them by revealing a ZK proof with a nullifier. This is the same pattern used by Tornado Cash (Ethereum), Zcash, and other ZK privacy protocols. References to "commitments" or "notes" in this context refer to this model, not to Solana's native account structure.
