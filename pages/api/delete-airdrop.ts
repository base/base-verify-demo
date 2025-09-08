import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { ethers } from 'ethers';

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

    // Validate the message format
    const deleteMessageRegex = /^Delete airdrop for (0x[a-fA-F0-9]{40})$/;
    const messageMatch = message.match(deleteMessageRegex);
    
    if (!messageMatch) {
      return res.status(400).json({
        error: 'Invalid message format. Expected: "Delete airdrop for <wallet address>"'
      });
    }

    const walletAddress = messageMatch[1];
    
    // Verify the signature by recovering the signer address
    let signerAddress: string;
    try {
      signerAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return res.status(400).json({
        error: 'Invalid signature'
      });
    }
    
    // Check if the signer address matches the address in the message
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({
        error: 'Signature address does not match the address in the delete message'
      });
    }

    // Check if the user exists in the database
    const existingUser = await prisma.verifiedUser.findUnique({
      where: { address: walletAddress }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found in airdrop list'
      });
    }

    // Delete the user from the database
    try {
      await prisma.verifiedUser.delete({
        where: { address: walletAddress }
      });

      console.log('Successfully deleted user:', walletAddress);

      return res.status(200).json({
        success: true,
        message: 'Airdrop deleted successfully',
        address: walletAddress
      });

    } catch (dbError) {
      console.error('Error deleting user from database:', dbError);
      return res.status(500).json({
        error: 'Failed to delete airdrop from database',
        details: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
      });
    }

  } catch (error) {
    console.error('Error in delete-airdrop route:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
