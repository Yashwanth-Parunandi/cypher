import { ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = ethers.utils.hexValue(SEPOLIA_CHAIN_ID_DECIMAL);
export const SEPOLIA_CHAIN_NAME = 'Sepolia';
export const SEPOLIA_EXPLORER_URL = 'https://sepolia.etherscan.io';

export function parseChainId(value: string | undefined): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    const parsed = Number.parseInt(trimmed, 16);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getExpectedChainId(): number {
  return parseChainId(import.meta.env.VITE_CHAIN_ID) ?? SEPOLIA_CHAIN_ID_DECIMAL;
}

export function getRpcUrl(): string {
  return import.meta.env.VITE_RPC_URL || import.meta.env.VITE_SEPOLIA_RPC_URL || '';
}
