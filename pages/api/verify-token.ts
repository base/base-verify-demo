import { NextApiRequest, NextApiResponse } from 'next';
import { config } from '../../lib/config';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signature, message } = req.body;

    // Validate required parameters
    if (!signature || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: signature and message'
      });
    }

    // Call the base-verify-api to verify the signature
    const verifyResponse = await fetch(`${config.baseVerifyUrl}/base_verify_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.baseVerifySecretKey}`
      },
      body: JSON.stringify({
        signature,
        message
      })
    });

    const responseBody = await verifyResponse.clone().text();
    console.log('Base verify API response body:', responseBody);
    
    if (!verifyResponse.ok) {
      console.error('Base verify API error:', verifyResponse.status, verifyResponse.statusText);
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
