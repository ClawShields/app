import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { WasmFactory } from "@lightprotocol/hasher.rs";
import { getConnection, getTokenConfig, EncryptionService } from "@/lib/privacy-cash";
import { CIRCUIT_PATH } from "@/lib/constants";
import { deposit, depositSPL } from "privacycash/utils";

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
 * Sentinel error thrown from transactionSigner to short-circuit the SDK
 * after the unsigned transaction has been captured, preventing the relay
 * step from executing.
 */
class TransactionCapturedError extends Error {
  constructor() {
    super("__TX_CAPTURED__");
    this.name = "TransactionCapturedError";
  }
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
    const { pubkey, amount, token = "SOL", signature } = body;

    // ---- Input validation ------------------------------------------------
    if (!pubkey || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Missing required fields: pubkey, amount" },
        { status: 400 },
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature for encryption key derivation" },
        { status: 400 },
      );
    }

    // ---- Resolve helpers -------------------------------------------------
    const publicKey = new PublicKey(pubkey);
    const tokenConfig = getTokenConfig(token);
    const connection = getConnection();
    const hasher = await getHasher();

    // Derive the encryption key the same way the agent's wallet would
    const encryptionService = new EncryptionService();
    encryptionService.deriveEncryptionKeyFromSignature(
      Uint8Array.from(Buffer.from(signature, "hex")),
    );

    const baseUnits = Math.round(amount * tokenConfig.unitsPerToken);

    // ---- Build the unsigned transaction ----------------------------------
    // The SDK's deposit/depositSPL flow ends by relaying the signed tx to
    // the indexer. We intercept the transaction *before* signing by using a
    // custom transactionSigner that captures the unsigned bytes and then
    // throws a sentinel error to abort the relay step.

    let unsignedTx = "";

    const transactionSigner = async (
      tx: Parameters<typeof deposit>[0] extends { transactionSigner: infer S }
        ? S extends (tx: infer T) => any
          ? T
          : never
        : never,
    ) => {
      // VersionedTransaction.serialize() does not validate signatures, so
      // we can safely serialise the unsigned transaction here.
      unsignedTx = Buffer.from(tx.serialize()).toString("base64");
      throw new TransactionCapturedError();
    };

    try {
      if (token.toUpperCase() === "SOL") {
        await deposit({
          connection,
          amount_in_lamports: baseUnits,
          keyBasePath: CIRCUIT_PATH,
          publicKey,
          transactionSigner: transactionSigner as any,
          storage: createMemoryStorage(),
          encryptionService,
          lightWasm: hasher,
        });
      } else {
        await depositSPL({
          connection,
          base_units: baseUnits,
          keyBasePath: CIRCUIT_PATH,
          publicKey,
          transactionSigner: transactionSigner as any,
          storage: createMemoryStorage(),
          encryptionService,
          lightWasm: hasher,
          mintAddress: tokenConfig.mint!,
        });
      }
    } catch (err: unknown) {
      // If the sentinel was thrown, we successfully captured the tx
      if (
        err instanceof TransactionCapturedError ||
        (err instanceof Error && err.message === "__TX_CAPTURED__")
      ) {
        // Expected — fall through to return the captured tx below
      } else {
        // Re-throw any unexpected error so the outer handler can deal with it
        throw err;
      }
    }

    if (!unsignedTx) {
      return NextResponse.json(
        { error: "Failed to capture unsigned transaction" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      unsignedTx,
      token: token.toUpperCase(),
      amount,
      baseUnits,
    });
  } catch (error: unknown) {
    console.error("Shield error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build shield transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
