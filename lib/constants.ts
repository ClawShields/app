import path from "path";
import { PublicKey } from "@solana/web3.js";

export const SUPPORTED_TOKENS = {
  SOL: {
    name: "SOL",
    symbol: "SOL",
    mint: null as PublicKey | null,
    decimals: 9,
    unitsPerToken: 1_000_000_000,
  },
  USDC: {
    name: "USDC",
    symbol: "USDC",
    mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    decimals: 6,
    unitsPerToken: 1_000_000,
  },
  USDT: {
    name: "USDT",
    symbol: "USDT",
    mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    decimals: 6,
    unitsPerToken: 1_000_000,
  },
} as const;

export type TokenSymbol = keyof typeof SUPPORTED_TOKENS;

export const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const BALANCE_SIGN_MESSAGE = "ClawShield balance query";

export const CIRCUIT_PATH = path.join(process.cwd(), "public", "circuit2");
