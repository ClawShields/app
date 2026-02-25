import { NextRequest, NextResponse } from "next/server";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getTokenConfig, EncryptionService } from "@/lib/privacy-cash";
import {
  getUtxos,
  getUtxosSPL,
  getBalanceFromUtxos,
  getBalanceFromUtxosSPL,
} from "privacycash/utils";

/**
 * Minimal in-memory Storage implementation satisfying the browser Storage
 * interface that the Privacy Cash SDK expects.
 */
function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pubkey, token = "SOL", signature } = body;

    // ---- Input validation --------------------------------------------------
    if (!pubkey || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: pubkey, signature" },
        { status: 400 },
      );
    }

    // ---- Resolve helpers ---------------------------------------------------
    const publicKey = new PublicKey(pubkey);
    const tokenConfig = getTokenConfig(token);
    const connection = getConnection();

    // Derive the encryption key the same way the agent's wallet would
    const encryptionService = new EncryptionService();
    encryptionService.deriveEncryptionKeyFromSignature(
      Uint8Array.from(Buffer.from(signature, "hex")),
    );

    // ---- Query shielded balance --------------------------------------------
    let balance: number;

    if (token.toUpperCase() === "SOL") {
      const utxos = await getUtxos({
        connection,
        publicKey,
        storage: createMemoryStorage(),
        encryptionService,
      });
      const result = getBalanceFromUtxos(utxos);
      balance = result.lamports / LAMPORTS_PER_SOL;
    } else {
      const utxos = await getUtxosSPL({
        connection,
        publicKey,
        storage: createMemoryStorage(),
        encryptionService,
        mintAddress: tokenConfig.mint!,
      });
      const result = getBalanceFromUtxosSPL(utxos);
      balance = result.base_units / tokenConfig.unitsPerToken;
    }

    return NextResponse.json({
      balance,
      token: token.toUpperCase(),
      lastUpdated: Date.now(),
    });
  } catch (error: unknown) {
    console.error("Balance error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to query balance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
