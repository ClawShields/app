import { Connection } from "@solana/web3.js";
import { EncryptionService } from "privacycash/utils";
import { RPC_URL, SUPPORTED_TOKENS, type TokenSymbol } from "./constants";

let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(RPC_URL, "confirmed");
  }
  return connectionInstance;
}

export function getTokenConfig(token: string) {
  const upper = token.toUpperCase() as TokenSymbol;
  const config = SUPPORTED_TOKENS[upper];
  if (!config) throw new Error(`Unsupported token: ${token}`);
  return config;
}

export { EncryptionService };
