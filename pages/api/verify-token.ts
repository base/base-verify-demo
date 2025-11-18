import { NextApiRequest, NextApiResponse } from 'next';
import { config } from '../../lib/config';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signature, message, code, codeVerifier } = req.body;

    // Validate required parameters
    if (!signature || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: signature and message'
      });
    }

    const requestBody: any = {
      signature,
      message
    };

    if (code && codeVerifier) {
      requestBody.code = code;
      requestBody.code_verifier = codeVerifier;
    }

    // Call the base-verify-api to verify the signature
    const uri = `${config.baseVerifyApiUrl}/base_verify_token`
    const verifyResponse = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.baseVerifySecretKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseBody = await verifyResponse.clone().text();
    console.log('Request URI:', uri);
    console.log('Base verify API response body:', responseBody);

    if (!verifyResponse.ok) {
      console.error('Base verify API error:', verifyResponse.status, verifyResponse.statusText);

      // Handle specific case where Twitter account verification traits are not satisfied
      if (verifyResponse.status === 400) {
        try {
          const errorData = JSON.parse(responseBody);
          if (errorData.message === 'verification_traits_not_satisfied') {
            return res.status(412).json({
              error: 'Twitter account verification required but not satisfied'
            });
          }
        } catch (parseError) {
          console.error('Error parsing response body:', parseError);
        }
      }

      return res.status(verifyResponse.status).json({
        error: 'Failed to verify signature with base-verify-api'
      });
    }

    // Get the verification data from the response
    const verificationData = await verifyResponse.json();

    // Extract the base verify token from response (support a few possible shapes)
    const baseVerifyToken: string | undefined =
      verificationData?.token ||
      verificationData?.data?.token;

    if (!baseVerifyToken || typeof baseVerifyToken !== 'string') {
      return res.status(500).json({
        error: 'Verification token missing from Base Verify response'
      });
    }

    // Store the verification data in the database
    try {
      // Extract user data from verification response
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
      const walletAddress = addressMatch ? addressMatch[0] : '';

      console.log('Extracted wallet address:', walletAddress);

      if (!walletAddress) {
        console.error('Failed to extract wallet address from message:', message);
        return res.status(400).json({
          error: 'Could not extract wallet address from message'
        });
      }

      console.log('Attempting to store user in database:', walletAddress);

      // Enforce uniqueness of the base verify token before writing
      const existingByToken = await prisma.verifiedUser.findUnique({
        where: { baseVerifyToken }
      });
      if (existingByToken) {
        return res.status(409).json({
          error: 'This verification token has already been used.'
        });
      }

      const result = await prisma.verifiedUser.upsert({
        where: { address: walletAddress },
        update: {
          updatedAt: new Date(),
          baseVerifyToken
        },
        create: {
          address: walletAddress,
          updatedAt: new Date(),
          baseVerifyToken
        }
      });

      console.log('Database operation successful:', result);

    } catch (dbError) {
      console.error('Error storing verification in database:', dbError);
      console.error('Database error details:', {
        message: (dbError as Error).message,
        stack: (dbError as Error).stack
      });

      // Fail the request if database storage fails - this is important for verification integrity
      return res.status(500).json({
        error: 'Failed to store verification in database',
        details: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
      });
    }

    // Return 200 OK with the verification data
    return res.status(200).json({
      success: true,
      verification: verificationData,
      message: 'Airdrop claimed successfully'
    });

  } catch (error) {
    console.error('Error in verify-token route:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
