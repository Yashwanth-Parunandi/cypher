import { ethers } from 'ethers';
import { getReadContract, getWriteContract } from './contractService';
import { ensureSepolia } from './networkService';
import { getOrCreateProvider } from './walletService';
import { normalizeWeb3Error } from './errorHandler';
import { normalizeIPFSHash } from '@/lib/ipfs';

const validationCache = new Map<string, { valid: boolean; expiresAt: number }>();
const VALIDATION_CACHE_TTL_MS = 15_000;
const READ_TIMEOUT_MS = 10_000;

export type TransactionOptions = {
  retries?: number;
  timeoutMs?: number;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Transaction timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readIssuedHashFromReceipt(receipt: any, contract: ReturnType<typeof getWriteContract>): string | null {
  const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];

  for (const log of logs) {
    try {
      if (!log || log.address?.toLowerCase?.() !== contract.address.toLowerCase()) {
        continue;
      }

      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'CertificateIssued') {
        const emittedHash = parsed.args?.ipfsHash ?? parsed.args?.[0];
        if (typeof emittedHash === 'string') {
          return normalizeIPFSHash(emittedHash).raw;
        }
      }
    } catch {
      // Ignore logs that do not belong to this contract or cannot be parsed.
    }
  }

  return null;
}

export async function issueCertificateOnChain(
  recipientName: string,
  courseName: string,
  ipfsHash: string,
  options: TransactionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 120000;
  const retries = options.retries ?? 1;
  const provider = getOrCreateProvider();
  const normalized = normalizeIPFSHash(ipfsHash);

  await ensureSepolia(provider);

  const contract = getWriteContract();
  const hash = normalized.raw;
  const fromAddress = await contract.signer.getAddress();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await contract.estimateGas.issueCertificate(recipientName, courseName, hash, {
        from: fromAddress,
      });

      const tx: ethers.ContractTransaction = await contract.issueCertificate(recipientName, courseName, hash);
      const receipt = await withTimeout(tx.wait(0), timeoutMs);

      if (receipt.status !== 1) {
        throw new Error('Transaction failed on-chain.');
      }

      const eventHash = readIssuedHashFromReceipt(receipt, contract);
      if (eventHash && eventHash !== hash) {
        throw new Error('Issued certificate hash does not match the transaction event payload.');
      }

      try {
        const cert = await withTimeout(contract.getCertificate(hash), READ_TIMEOUT_MS);
        const storedHash = normalizeIPFSHash(cert.ipfsHash || hash).raw;
        if (storedHash !== hash) {
          console.warn('On-chain certificate hash mismatch after issuance:', {
            submittedHash: hash,
            storedHash,
            txHash: tx.hash,
          });
        }

        if (Number(cert.issuedOn?.toString?.() ?? cert.issuedOn ?? 0) <= 0) {
          console.warn('On-chain certificate record looks incomplete after issuance:', {
            submittedHash: hash,
            txHash: tx.hash,
          });
        }
      } catch (verificationError: any) {
        console.warn('Best-effort on-chain readback failed after issuance:', {
          submittedHash: hash,
          txHash: tx.hash,
          error: verificationError?.message || verificationError,
        });

        if (!eventHash) {
          console.warn('Certificate issuance receipt did not include a parseable event:', {
            submittedHash: hash,
            txHash: tx.hash,
          });
        }
      }

      validationCache.delete(hash);
      return tx.hash;
    } catch (error: any) {
      const normalizedError = normalizeWeb3Error(error);
      if (attempt < retries && normalizedError.retryable) {
        continue;
      }
      throw new Error(normalizedError.message);
    }
  }

  throw new Error('Transaction failed unexpectedly.');
}

export async function validateCertificateOnChain(ipfsHash: string): Promise<boolean> {
  const { raw } = normalizeIPFSHash(ipfsHash);
  const cached = validationCache.get(raw);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.valid;
  }

  const contract = getReadContract();
  await withTimeout(ensureSepolia(contract.provider), READ_TIMEOUT_MS);
  const valid = await withTimeout<boolean>(contract.validateCertificate(raw), READ_TIMEOUT_MS);
  validationCache.set(raw, { valid, expiresAt: Date.now() + VALIDATION_CACHE_TTL_MS });
  return valid;
}

export async function revokeCertificateOnChain(
  ipfsHash: string,
  options: TransactionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 120000;
  const provider = getOrCreateProvider();
  const normalized = normalizeIPFSHash(ipfsHash);

  await ensureSepolia(provider);

  const contract = getWriteContract();
  const hash = normalized.raw;

  try {
    const tx: ethers.ContractTransaction = await contract.revokeCertificate(hash);
    const receipt = await withTimeout(tx.wait(0), timeoutMs);

    if (receipt.status !== 1) {
      throw new Error('Revocation transaction failed on-chain.');
    }

    validationCache.delete(normalized.raw);
    return tx.hash;
  } catch (error: any) {
    const normalizedErr = normalizeWeb3Error(error);
    throw new Error(normalizedErr.message);
  }
}

export async function getCertificateFromChain(ipfsHash: string): Promise<any> {
  const { raw } = normalizeIPFSHash(ipfsHash);
  const contract = getReadContract();
  await withTimeout(ensureSepolia(contract.provider), READ_TIMEOUT_MS);
  const certData = await withTimeout<any>(contract.getCertificate(raw), READ_TIMEOUT_MS);

  const rawIssuedOn = certData.issuedOn?.toString?.() ?? certData.issuedOn ?? '0';
  const issuedSec = Number(rawIssuedOn);
  const issuedOn = issuedSec > 0 ? new Date(issuedSec * 1000).toISOString() : new Date().toISOString();

  const rawRevokedAt = certData.revokedAt?.toString?.() ?? certData.revokedAt ?? '0';
  const revokedSec = Number(rawRevokedAt);
  const isRevoked = revokedSec > 0;
  const revokedAt = isRevoked ? new Date(revokedSec * 1000).toISOString() : undefined;

  return {
    recipientName: certData.recipientName,
    courseName: certData.courseName,
    ipfsHash: normalizeIPFSHash(certData.ipfsHash || raw).raw,
    issuer: certData.issuer,
    issuedOn,
    isRevoked,
    revokedAt,
  };
}
