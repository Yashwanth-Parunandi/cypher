import { ethers } from 'ethers';
import { 
  getExpectedChainId, 
  getRpcUrl, 
  SEPOLIA_CHAIN_ID_HEX, 
  SEPOLIA_CHAIN_ID_DECIMAL, 
  SEPOLIA_CHAIN_NAME, 
  SEPOLIA_EXPLORER_URL 
} from '@/config/networks';

export function isExpectedNetwork(chainId: number): boolean {
  return chainId === getExpectedChainId();
}

export function isSepolia(chainId: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID_DECIMAL;
}

export async function validateNetwork(provider: ethers.providers.Provider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    return network.chainId === getExpectedChainId();
  } catch {
    return false;
  }
}

export async function addSepoliaNetwork(): Promise<void> {
  const ethereum = (window as any).ethereum;
  const rpcUrl = getRpcUrl() || 'https://rpc.sepolia.org';

  if (!ethereum || typeof ethereum.request !== 'function') {
    throw new Error('MetaMask is not available.');
  }

  await ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: SEPOLIA_CHAIN_ID_HEX,
        chainName: SEPOLIA_CHAIN_NAME,
        rpcUrls: [rpcUrl],
        blockExplorerUrls: [SEPOLIA_EXPLORER_URL],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      },
    ],
  });
}

export async function addGanacheNetwork(): Promise<void> {
  const ethereum = (window as any).ethereum;
  const rpcUrl = getRpcUrl() || 'http://127.0.0.1:7545';

  if (!ethereum || typeof ethereum.request !== 'function') {
    throw new Error('MetaMask is not available.');
  }

  await ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x539', // 1337
        chainName: 'Ganache Localhost',
        rpcUrls: [rpcUrl],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      },
    ],
  });
}

export async function switchToExpectedNetwork(): Promise<void> {
  const ethereum = (window as any).ethereum;

  if (!ethereum || typeof ethereum.request !== 'function') {
    throw new Error('MetaMask is not available.');
  }

  const expectedChainId = getExpectedChainId();
  const hexChainId = ethers.utils.hexValue(expectedChainId);

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error: any) {
    if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
      if (expectedChainId === SEPOLIA_CHAIN_ID_DECIMAL) {
        await addSepoliaNetwork();
      } else if (expectedChainId === 1337) {
        await addGanacheNetwork();
      } else {
        throw new Error(`Chain ID ${expectedChainId} is not configured in MetaMask. Please add it manually.`);
      }
      return;
    }

    if (error?.code === 4001) {
      throw new Error('Network switch rejected by user.');
    }

    throw error;
  }
}

export async function switchToSepolia(): Promise<void> {
  return switchToExpectedNetwork();
}

export async function ensureSepolia(provider: ethers.providers.Provider): Promise<void> {
  const expectedChainId = getExpectedChainId();
  const network = await provider.getNetwork();

  if (network.chainId === expectedChainId) return;

  if (provider instanceof ethers.providers.Web3Provider) {
    await switchToExpectedNetwork();
    return;
  }

  throw new Error(`Connected RPC (${network.chainId}) does not match expected chain (${expectedChainId}).`);
}
