import { ethers } from 'ethers';
import CertVaultABI from '../contracts/CertVault.json';
import { getCertVaultAddress } from '@/config/contracts';
import { getReadOnlyProvider, getSigner } from './walletService';

export function getReadContract(): ethers.Contract {
  const provider = getReadOnlyProvider();
  return new ethers.Contract(getCertVaultAddress(), CertVaultABI, provider);
}

export function getWriteContract(): ethers.Contract {
  const signer = getSigner();
  if (!signer) {
    throw new Error('Wallet is not connected.');
  }

  return new ethers.Contract(getCertVaultAddress(), CertVaultABI, signer);
}

export async function getSafeSigner(): Promise<ethers.Signer> {
  const signer = getSigner();
  if (!signer) {
    throw new Error('Wallet is not connected.');
  }

  return signer;
}
