import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { WasmFactory } from "@lightprotocol/hasher.rs";
import { getConnection, getTokenConfig, EncryptionService } from "@/lib/privacy-cash";
import { CIRCUIT_PATH } from "@/lib/constants";
import { withdraw, withdrawSPL } from "privacycash/utils";

// Singleton hasher instance — lazily initialized
let lightWasm: Awaited<ReturnType<typeof WasmFactory.getInstance>> | null =
  null;

async function getHasher() {
  if (!lightWasm) {
    lightWasm = await WasmFactory.getInstance();
  }
  return lightWasm;
}

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
    const { pubkey, amount, token = "SOL", recipient, signature } = body;

    // ---- Input validation --------------------------------------------------
    if (!pubkey || !amount || amount <= 0 || !recipient) {
      return NextResponse.json(
        { error: "Missing required fields: pubkey, amount, recipient" },
        { status: 400 },
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature for encryption key derivation" },
        { status: 400 },
      );
    }

    // ---- Resolve helpers ---------------------------------------------------
    const publicKey = new PublicKey(pubkey);
    const recipientKey = new PublicKey(recipient);
    const tokenConfig = getTokenConfig(token);
    const connection = getConnection();
    const hasher = await getHasher();

    // Derive the encryption key the same way the agent's wallet would
    const encryptionService = new EncryptionService();
    encryptionService.deriveEncryptionKeyFromSignature(
      Uint8Array.from(Buffer.from(signature, "hex")),
    );

    const baseUnits = Math.round(amount * tokenConfig.unitsPerToken);

    // ---- Execute withdrawal ------------------------------------------------
    // Unlike shield (deposit), withdraw does NOT use a transactionSigner.
    // The SDK generates a ZK proof and submits the transaction via its own
    // relayer internally, returning the tx hash directly.

    if (token.toUpperCase() === "SOL") {
      const result = await withdraw({
        lightWasm: hasher,
        connection,
        amount_in_lamports: baseUnits,
        keyBasePath: CIRCUIT_PATH,
        publicKey,
        storage: createMemoryStorage(),
        encryptionService,
        recipient: recipientKey,
      });

      return NextResponse.json({
        tx: result.tx,
        isPartial: result.isPartial,
        token: token.toUpperCase(),
        amount,
        recipient,
        fee_in_lamports: result.fee_in_lamports,
      });
    } else {
      const result = await withdrawSPL({
        lightWasm: hasher,
        connection,
        base_units: baseUnits,
        keyBasePath: CIRCUIT_PATH,
        publicKey,
        storage: createMemoryStorage(),
        encryptionService,
        recipient: recipientKey,
        mintAddress: tokenConfig.mint!,
      });

      return NextResponse.json({
        tx: result.tx,
        isPartial: result.isPartial,
        token: token.toUpperCase(),
        amount,
        recipient,
        fee_base_units: result.fee_base_units,
      });
    }
  } catch (error: unknown) {
    console.error("Withdraw error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute withdrawal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
