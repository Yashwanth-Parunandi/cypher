import { isMetaMaskInstalled, connectWallet, getProvider, getSigner, resetWalletState, attachWalletListeners, recreateProvider } from './walletService';
import { addSepoliaNetwork, ensureSepolia, isSepolia, switchToSepolia, switchToExpectedNetwork, validateNetwork } from './networkService';
import { getReadContract, getWriteContract, getSafeSigner } from './contractService';
import { issueCertificateOnChain, validateCertificateOnChain, getCertificateFromChain, revokeCertificateOnChain } from './transactionService';

export {
  isMetaMaskInstalled,
  connectWallet as connectMetaMask,
  getProvider,
  getSigner,
  resetWalletState,
  attachWalletListeners,
  recreateProvider,
  addSepoliaNetwork,
  ensureSepolia,
  isSepolia,
  switchToSepolia,
  switchToExpectedNetwork,
  validateNetwork,
  getReadContract,
  getWriteContract,
  getSafeSigner,
  issueCertificateOnChain,
  validateCertificateOnChain,
  getCertificateFromChain,
  revokeCertificateOnChain,
};

export async function getCurrentChainId(): Promise<number | null> {
  const provider = getProvider();
  if (!provider) {
    return null;
  }

  try {
    const network = await provider.getNetwork();
    return network.chainId;
  } catch {
    return null;
  }
}
