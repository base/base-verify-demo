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

    // Store the verification data in the database
    try {
      // Extract user data from verification response
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
      const walletAddress = addressMatch ? addressMatch[0] : '';
      await prisma.verifiedUser.upsert({
        where: { id: walletAddress },
        update: {
          updatedAt: new Date()
        },
        create: {
          id: walletAddress,
          updatedAt: new Date()
        }
      });

    } catch (dbError) {
      console.error('Error storing verification in database:', dbError);
      // Don't fail the request if database storage fails
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
