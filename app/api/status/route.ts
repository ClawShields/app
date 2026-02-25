import { NextResponse } from "next/server";
import { getConnection } from "@/lib/privacy-cash";

export async function GET() {
  try {
    const connection = getConnection();
    const version = await connection.getVersion();
    return NextResponse.json({
      healthy: true,
      network: "mainnet-beta",
      solanaVersion: version["solana-core"],
      protocolVersion: "1.0",
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { healthy: false, error: "Failed to connect to Solana" },
      { status: 503 }
    );
  }
}
