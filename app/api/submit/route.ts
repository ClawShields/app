import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/privacy-cash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signedTx } = body;

    if (!signedTx) {
      return NextResponse.json(
        { error: "Missing required field: signedTx" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const txBuffer = Buffer.from(signedTx, "base64");

    const txHash = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Confirm the transaction
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: txHash,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    return NextResponse.json({
      txHash,
      status: "confirmed",
    });
  } catch (error: unknown) {
    console.error("Submit error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
