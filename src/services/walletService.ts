import { ethers } from 'ethers';
import { getRpcUrl } from '@/config/networks';

let provider: ethers.providers.BaseProvider | null = null;
let readOnlyProvider: ethers.providers.JsonRpcProvider | null = null;
let signer: ethers.Signer | null = null;
let connectedAddress: string | null = null;
let listenersAttached = false;
const walletInvalidationListeners = new Set<() => void>();

function getEthereum(): any {
  return typeof window !== 'undefined' ? (window as any).ethereum : null;
}

export function isMetaMaskInstalled(): boolean {
  return Boolean(getEthereum());
}

export function getProvider(): ethers.providers.BaseProvider | null {
  return provider;
}

export function getReadOnlyProvider(): ethers.providers.BaseProvider {
  const rpcUrl = getRpcUrl();
  if (rpcUrl) {
    if (!readOnlyProvider) {
      readOnlyProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }
    return readOnlyProvider;
  }

  return getOrCreateProvider();
}

export function getSigner(): ethers.Signer | null {
  if (signer) {
    return signer;
  }

  if (provider && 'getSigner' in provider) {
    signer = (provider as ethers.providers.Web3Provider).getSigner();
    return signer;
  }

  const ethereum = getEthereum();
  if (ethereum) {
    const web3 = new ethers.providers.Web3Provider(ethereum, 'any');
    provider = web3;
    signer = web3.getSigner();
    return signer;
  }

  return null;
}

export function getConnectedAddress(): string | null {
  return connectedAddress;
}

export function resetWalletState(): void {
  provider = null;
  signer = null;
  connectedAddress = null;
}

function notifyInvalidation(): void {
  walletInvalidationListeners.forEach((listener) => listener());
}

export function onWalletStateInvalidated(listener: () => void): () => void {
  walletInvalidationListeners.add(listener);
  return () => walletInvalidationListeners.delete(listener);
}

export function attachWalletListeners(): void {
  const ethereum = getEthereum();
  if (!ethereum || typeof ethereum.on !== 'function' || listenersAttached) {
    return;
  }
  // Avoid attaching multiple listeners across HMR or repeated calls by marking
  // the injected provider object itself. Some browser extensions or HMR
  // reloads can cause duplicate handlers which trigger MaxListeners warnings.
  const FLAG = '__cypher_listeners_attached';
  if ((ethereum as any)[FLAG]) {
    listenersAttached = true;
    return;
  }

  ethereum.on('chainChanged', () => {
    resetWalletState();
    notifyInvalidation();
  });

  ethereum.on('accountsChanged', (accounts: string[]) => {
    // clear signer/provider on account changes — will be recreated on next usage
    resetWalletState();
    notifyInvalidation();
  });

  ethereum.on('disconnect', () => {
    resetWalletState();
    notifyInvalidation();
  });

  (ethereum as any)[FLAG] = true;
  listenersAttached = true;
}

export function recreateProvider(): ethers.providers.Web3Provider {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error('MetaMask is not installed.');
  }

  const web3 = new ethers.providers.Web3Provider(ethereum, 'any');
  provider = web3;
  return web3;
}

export function getOrCreateProvider(): ethers.providers.BaseProvider {
  if (provider) return provider;

  const ethereum = getEthereum();
  if (ethereum) {
    const web3 = new ethers.providers.Web3Provider(ethereum, 'any');
    provider = web3;
    return web3;
  }

  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    throw new Error('No Ethereum provider available and no RPC URL configured.');
  }

  const json = new ethers.providers.JsonRpcProvider(rpcUrl);
  provider = json;
  return json;
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error('MetaMask is not installed.');
  }

  attachWalletListeners();

  const web3Provider = new ethers.providers.Web3Provider(ethereum, 'any');
  provider = web3Provider;
  await web3Provider.send('eth_requestAccounts', []);

  signer = web3Provider.getSigner();
  connectedAddress = await signer.getAddress();

  return connectedAddress;
}

export async function getConnectedWalletAddress(): Promise<string | null> {
  const currentSigner = getSigner();
  if (currentSigner) {
    try {
      return await currentSigner.getAddress();
    } catch {
      // fall through and try the injected provider directly
    }
  }

  const ethereum = getEthereum();
  if (!ethereum || typeof ethereum.request !== 'function') {
    return connectedAddress;
  }

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  if (Array.isArray(accounts) && accounts.length > 0) {
    connectedAddress = accounts[0];
    const web3Provider = new ethers.providers.Web3Provider(ethereum, 'any');
    provider = web3Provider;
    signer = web3Provider.getSigner();
    return connectedAddress;
  }

  return connectedAddress;
}
