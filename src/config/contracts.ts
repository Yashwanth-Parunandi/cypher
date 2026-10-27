import { ethers } from 'ethers';

export function getCertVaultAddress(): string {
  const address = import.meta.env.VITE_CONTRACT_ADDRESS || '';

  if (!address) {
    throw new Error('Missing VITE_CONTRACT_ADDRESS.');
  }

  try {
    return ethers.utils.getAddress(address);
  } catch {
    throw new Error('Invalid contract address in VITE_CONTRACT_ADDRESS.');
  }
}
