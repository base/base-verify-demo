import { NextApiRequest, NextApiResponse } from "next";
import { config } from "../../../lib/config";
import { parseVerifyBackendError } from "../../../lib/verifyApiErrors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { signature, message } = req.body;

    if (!signature || !message) {
      return res.status(400).json({
        error: "Missing required parameters: signature and message",
      });
    }

    if (!config.claimContractAddress) {
      return res.status(500).json({ error: "Claim contract not configured" });
    }

    // Exchange the SIWE message + signature for a signed { identityHash, expiration, signature }.
    // The signature is the credential (no secret key); no DB write — dedup lives on-chain.
    const uri = `${config.baseVerifyApiUrl}/onchain_verify_token`;
    const verifyResponse = await fetch(uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signature,
        message,
      }),
    });

    const responseBody = await verifyResponse.clone().text();
    console.log("Request URI:", uri);
    console.log("Onchain verify API response:", responseBody);

    if (!verifyResponse.ok) {
      console.error(
        "Onchain verify API error:",
        verifyResponse.status,
        verifyResponse.statusText
      );
      return res.status(verifyResponse.status).json({
        error: parseVerifyBackendError(verifyResponse.status, responseBody),
      });
    }

    const tokenData = await verifyResponse.json();
    return res.status(200).json({ success: true, token: tokenData });
  } catch (error) {
    console.error("Error in onchain verify-token route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
