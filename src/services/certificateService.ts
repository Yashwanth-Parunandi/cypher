import { Certificate, CertificateData } from '../types/certificate';
import { User } from '../types/user';
import { uploadToPinata, getFromIPFS } from './ipfsService';
import { normalizeIPFSHash } from '@/lib/ipfs';
import { 
  issueCertificateOnChain, 
  validateCertificateOnChain,
  getCertificateFromChain,
  revokeCertificateOnChain 
} from './transactionService';
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc, 
  arrayUnion, 
  type DocumentData 
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CERTIFICATES_COLLECTION = 'certificates';
const USERS_COLLECTION = 'users';
const CERTIFICATE_OWNER_FIELDS = ['issuedBy', 'issuerId', 'creatorId', 'ownerId', 'userId'] as const;
const CERTIFICATE_LOOKUP_TIMEOUT_MS = 5_000;
const CERTIFICATE_PERSIST_TIMEOUT_MS = 10_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Certificate metadata lookup timed out.'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type FirestoreCertificateRecord = Certificate & {
  blockchainValid?: boolean;
  legacySource?: string;
  ipfsCid?: string;
  ipfsUri?: string;
  revoked?: boolean;
  revokedAt?: string;
};

function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value === 'undefined') {
    return fallback;
  }
  return String(value);
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return fallback;
}

function normalizeCertificateRecord(data: DocumentData, fallbackId: string): FirestoreCertificateRecord {
  const ipfsSource = data.ipfsHash ?? data.ipfsCid ?? data.cid ?? data.ipfsUri ?? data.ipfs;
  const normalizedHash = typeof ipfsSource === 'string' && ipfsSource.trim().length > 0
    ? normalizeIPFSHash(ipfsSource)
    : null;

  const issuedOn = toIsoString(data.issuedOn ?? data.createdAt, new Date().toISOString());
  const assignedDate = toIsoString(data.assignedDate ?? data.issuedOn ?? issuedOn, issuedOn);

  return {
    id: safeString(data.id ?? fallbackId, fallbackId),
    firstName: safeString(data.firstName),
    lastName: safeString(data.lastName),
    organization: safeString(data.organization),
    certifiedFor: safeString(data.certifiedFor),
    assignedDate,
    duration: typeof data.duration === 'undefined' ? undefined : safeString(data.duration),
    recipientEmail: safeString(data.recipientEmail),
    templateType: data.templateType || 'classic',
    ipfsHash: normalizedHash?.raw ?? safeString(data.ipfsHash ?? ipfsSource),
    issuedBy: safeString(data.issuedBy ?? data.issuerId ?? data.ownerId ?? data.creatorId ?? data.userId),
    issuedOn,
    expiresOn: typeof data.expiresOn !== 'undefined' && data.expiresOn ? toIsoString(data.expiresOn, '') : undefined,
    blockchainValid: typeof data.blockchainValid === 'boolean' ? data.blockchainValid : undefined,
    revoked: Boolean(data.revoked),
    revokedAt: data.revokedAt ? toIsoString(data.revokedAt, '') : undefined,
    ipfsCid: normalizedHash?.raw,
    ipfsUri: normalizedHash?.prefixed,
    legacySource: safeString(data.legacySource ?? data.source ?? ''),
  };
}

function uniqCertificates(certificates: FirestoreCertificateRecord[]): FirestoreCertificateRecord[] {
  const seen = new Set<string>();

  return certificates.filter((certificate) => {
    const key = `${certificate.id}:${certificate.ipfsHash}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function upsertCertificateRecord(certificate: FirestoreCertificateRecord): Promise<void> {
  if (!db) return;
  const { raw } = normalizeIPFSHash(certificate.ipfsHash);
  const certDocRef = doc(db, CERTIFICATES_COLLECTION, certificate.id);

  await setDoc(
    certDocRef,
    {
      ...certificate,
      ipfsHash: raw,
      ipfsCid: raw,
      ipfsUri: `ipfs://${raw}`,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function upsertUserCertificateIndex(currentUser: User, certificateId: string): Promise<void> {
  if (!db) return;
  const userDocRef = doc(db, USERS_COLLECTION, currentUser.id);

  await setDoc(
    userDocRef,
    {
      id: currentUser.id,
      email: currentUser.email,
      fullName: currentUser.fullName,
      userType: currentUser.userType,
      certificates: arrayUnion(certificateId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function fetchCertificatesByOwnerField(userId: string): Promise<FirestoreCertificateRecord[]> {
  if (!db) return [];
  const queryResults = await Promise.all(
    CERTIFICATE_OWNER_FIELDS.map((field) =>
      getDocs(query(collection(db, CERTIFICATES_COLLECTION), where(field, '==', userId))).then(
        (snapshot) => snapshot,
        (error: unknown) => {
          console.warn(`Certificate owner query failed for ${field}:`, error);
          return null;
        }
      )
    )
  );

  const certificates = queryResults.flatMap((snapshot) => {
    if (!snapshot) return [];
    return snapshot.docs.map((certificateDoc) =>
      normalizeCertificateRecord(certificateDoc.data(), certificateDoc.id)
    );
  });

  let userSnapshot;
  let userIndexError: unknown;
  try {
    userSnapshot = await getDoc(doc(db, USERS_COLLECTION, userId));
  } catch (error) {
    userIndexError = error;
    console.warn('Could not read the issuer certificate index:', error);
  }

  const certificateIds = userSnapshot?.exists()
    ? userSnapshot.data().certificates
    : undefined;
  let indexedCertificateReadFailed = false;
  if (Array.isArray(certificateIds)) {
    const indexedCertificates = await Promise.all(
      certificateIds
        .filter((certificateId): certificateId is string => typeof certificateId === 'string')
        .map(async (certificateId) => {
          try {
            const certificateSnapshot = await getDoc(
              doc(db, CERTIFICATES_COLLECTION, certificateId)
            );
            return certificateSnapshot.exists()
              ? normalizeCertificateRecord(certificateSnapshot.data(), certificateSnapshot.id)
              : null;
          } catch (error) {
            indexedCertificateReadFailed = true;
            console.warn(`Could not read indexed certificate ${certificateId}:`, error);
            return null;
          }
        })
    );
    certificates.push(...indexedCertificates.filter(
      (certificate): certificate is FirestoreCertificateRecord => certificate !== null
    ));
  }

  if (
    certificates.length === 0 &&
    (queryResults.every((snapshot) => snapshot === null) ||
      userIndexError ||
      indexedCertificateReadFailed)
  ) {
    throw new Error('Unable to read issuer certificates from Firestore. Check your access and try again.');
  }

  return uniqCertificates(certificates);
}

/**
 * Hydrates certificates with true on-chain verification state.
 */
async function hydrateBlockchainStatus(certificates: FirestoreCertificateRecord[]): Promise<FirestoreCertificateRecord[]> {
  const hydrated = await Promise.all(
    certificates.map(async (certificate) => {
      try {
        if (!certificate.ipfsHash) {
          return { ...certificate, blockchainValid: false };
        }
        const onChainValid = await validateCertificateOnChain(certificate.ipfsHash);
        return {
          ...certificate,
          blockchainValid: onChainValid,
        };
      } catch {
        return {
          ...certificate,
          blockchainValid: certificate.blockchainValid ?? false,
        };
      }
    })
  );

  return uniqCertificates(hydrated);
}

async function recoverCertificateFromIPFS(hash: string): Promise<Certificate | undefined> {
  const metadata = await getFromIPFS(hash);

  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const normalizedHash = metadata.ipfsHash ? normalizeIPFSHash(metadata.ipfsHash).raw : normalizeIPFSHash(hash).raw;

  if (!metadata.firstName || !metadata.lastName || !metadata.certifiedFor || !metadata.organization) {
    return undefined;
  }

  return {
    id: metadata.id ?? normalizedHash,
    ipfsHash: normalizedHash,
    issuedBy: metadata.issuedBy ?? 'unknown',
    issuedOn: metadata.issuedOn ?? new Date().toISOString(),
    expiresOn: metadata.expiresOn,
    templateType: metadata.templateType ?? 'classic',
    firstName: metadata.firstName,
    lastName: metadata.lastName,
    organization: metadata.organization,
    certifiedFor: metadata.certifiedFor,
    assignedDate: metadata.assignedDate ?? metadata.issuedOn ?? new Date().toISOString(),
    duration: metadata.duration,
    recipientEmail: metadata.recipientEmail ?? '',
    ipfsCid: normalizedHash,
    ipfsUri: `ipfs://${normalizedHash}`,
  } as Certificate;
}

/**
 * Calculate expiration date safely without throwing RangeError.
 */
function calculateExpirationDate(assignedDateStr: string, durationStr?: string): string | undefined {
  if (!durationStr || !durationStr.trim()) return undefined;
  const numYears = Number(durationStr);
  if (isNaN(numYears) || numYears <= 0) return undefined;

  const baseDate = assignedDateStr ? new Date(assignedDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return undefined;

  const expDate = new Date(baseDate);
  expDate.setFullYear(expDate.getFullYear() + numYears);
  return expDate.toISOString();
}

/**
 * Issue and persist a new certificate.
 */
export const generateCertificate = async (
  data: CertificateData,
  currentUser: User
): Promise<Certificate> => {
  if (!currentUser?.id) {
    throw new Error('You must be logged in to generate a certificate.');
  }

  // Strict role check: recipients / students cannot issue certificates
  if (currentUser.userType === 'recipient') {
    throw new Error('Unauthorized: Recipients and students are not permitted to generate certificates. Only Admins and Issuers can issue certificates.');
  }

  const certificateId = uuidv4();
  const assignedDate = data.assignedDate || new Date().toISOString().split('T')[0];
  const expiresOn = calculateExpirationDate(assignedDate, data.duration);

  const certificateMetadata = {
    id: certificateId,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    organization: data.organization.trim(),
    certifiedFor: data.certifiedFor.trim(),
    assignedDate,
    duration: data.duration,
    recipientEmail: data.recipientEmail.trim(),
    templateType: data.templateType || 'classic',
    issuedBy: currentUser.id,
    issuedOn: new Date().toISOString(),
    expiresOn,
  };

  try {
    // 1. Upload metadata to IPFS
    const uploadedIpfsHash = await uploadToPinata(certificateMetadata);
    if (!uploadedIpfsHash) {
      throw new Error('Failed to upload certificate metadata to IPFS. Please verify your connection or Pinata credentials.');
    }

    const { raw: rawCid, prefixed: prefixedCid } = normalizeIPFSHash(uploadedIpfsHash);

    // 2. Issue on Blockchain (Smart Contract)
    const recipientName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    let blockchainTxHash = '';
    let blockchainSuccess = false;

    try {
      blockchainTxHash = await issueCertificateOnChain(recipientName, data.certifiedFor.trim(), rawCid);
      blockchainSuccess = true;
    } catch (blockchainError: any) {
      console.error('Blockchain certificate issuance failed:', blockchainError);
      throw new Error(`Blockchain registration failed: ${blockchainError.message || 'Smart contract rejected transaction'}`);
    }

    // 3. Construct Certificate entity
    const certificate: Certificate = {
      id: certificateId,
      ipfsHash: rawCid,
      issuedBy: currentUser.id,
      issuedOn: new Date().toISOString(),
      expiresOn,
      templateType: data.templateType || 'classic',
      ipfsCid: rawCid,
      ipfsUri: prefixedCid,
      blockchainValid: blockchainSuccess,
      txHash: blockchainTxHash,
      revoked: false,
      ...data,
      assignedDate,
    };

    // 4. Save to Firestore
    if (db) {
      try {
        await withTimeout(
          upsertCertificateRecord(certificate as FirestoreCertificateRecord),
          CERTIFICATE_PERSIST_TIMEOUT_MS,
          'Saving the certificate record timed out.'
        );
        await withTimeout(
          upsertUserCertificateIndex(currentUser, certificateId),
          CERTIFICATE_PERSIST_TIMEOUT_MS,
          'Updating the user certificate index timed out.'
        );
      } catch (dbError) {
        console.warn('Certificate recorded on chain/IPFS but Firestore index update had an issue:', dbError);
      }
    }

    return certificate;
  } catch (error: any) {
    console.error('Error in generateCertificate:', error);
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to perform this action. Please sign in again.');
    }
    throw error;
  }
};

/**
 * Validate a certificate by IPFS hash across blockchain, DB, and IPFS.
 */
export const validateCertificate = async (hash: string): Promise<{
  isValid: boolean;
  certificate?: Certificate;
  message: string;
  blockchainValid: boolean;
  isRevoked: boolean;
  revokedAt?: string;
}> => {
  const { raw: normalized } = normalizeIPFSHash(hash);

  // Parallelize on‑chain validation and DB/IPFS lookup
  const onChainPromise = (async () => {
    try {
      const details = await getCertificateFromChain(normalized);
      return { valid: !details.isRevoked, details };
    } catch {
      return { valid: false, details: {} };
    }
  })();

  const dbPromise = (async () => {
    let cert: Certificate | undefined;
    try {
      cert = await withTimeout(getCertificateByHash(normalized), CERTIFICATE_LOOKUP_TIMEOUT_MS);
    } catch (error) {
      console.warn('Certificate database lookup did not complete; checking IPFS:', error);
    }

    if (!cert) {
      cert = await recoverCertificateFromIPFS(normalized);
      if (cert && db) {
        void upsertCertificateRecord(cert as FirestoreCertificateRecord).catch((error) => {
          console.warn('Could not cache recovered certificate metadata in Firestore:', error);
        });
      }
    }
    return cert;
  })();

  const [{ valid: onChainValid, details: chainDetails }, certificate] = await Promise.all([onChainPromise, dbPromise]);

  // Determine revocation state from on‑chain details or DB flag
  let isRevoked = false;
  let revokedAt: string | undefined;
  if (chainDetails && chainDetails.isRevoked) {
    isRevoked = true;
    revokedAt = chainDetails.revokedAt;
  } else if (certificate?.revoked) {
    isRevoked = true;
    revokedAt = certificate.revokedAt;
  }

  if (!certificate) {
    return {
      isValid: false,
      blockchainValid: false,
      isRevoked: false,
      message: 'Certificate metadata could not be found on IPFS or in database.',
    };
  }

  const isExpired = certificate.expiresOn && new Date(certificate.expiresOn) < new Date();

  if (isRevoked) {
    return {
      isValid: false,
      certificate,
      blockchainValid: false,
      isRevoked: true,
      revokedAt,
      message: 'This certificate has been revoked by the issuing authority.',
    };
  }

  if (isExpired) {
    return {
      isValid: false,
      certificate,
      blockchainValid: onChainValid,
      isRevoked: false,
      message: 'Certificate was found and verified, but has expired.',
    };
  }

  return {
    isValid: onChainValid,
    certificate,
    blockchainValid: onChainValid,
    isRevoked: false,
    message: onChainValid
      ? 'Certificate successfully verified on the blockchain.'
      : 'Certificate metadata exists, but was NOT found or verified on the blockchain.',
  };
};

/**
 * Revoke an issued certificate.
 */
export const revokeCertificate = async (
  certId: string,
  ipfsHash: string,
  currentUser: User
): Promise<{ success: boolean; txHash?: string }> => {
  if (currentUser.userType !== 'admin' && currentUser.userType !== 'issuer') {
    throw new Error('Only admins or issuers can revoke certificates.');
  }

  // 1. Revoke on Blockchain
  const txHash = await revokeCertificateOnChain(ipfsHash);

  // 2. Update Firestore
  if (db) {
    const certDocRef = doc(db, CERTIFICATES_COLLECTION, certId);
    await setDoc(
      certDocRef,
      {
        revoked: true,
        revokedAt: new Date().toISOString(),
        blockchainValid: false,
        revokedBy: currentUser.id,
      },
      { merge: true }
    );
  }

  return { success: true, txHash };
};

/**
 * Get certificates received by a user (recipient matching user's email).
 */
export const getReceivedCertificates = async (recipientEmail: string): Promise<Certificate[]> => {
  if (!db || !recipientEmail) return [];
  try {
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where('recipientEmail', '==', recipientEmail.trim().toLowerCase())
    );
    const snapshot = await getDocs(q);
    const certs = snapshot.docs.map((d) => normalizeCertificateRecord(d.data(), d.id));
    return await hydrateBlockchainStatus(certs);
  } catch (err) {
    console.warn('Error fetching received certificates:', err);
    return [];
  }
};

/**
 * Get all certificates created or owned by a user.
 */
export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  try {
    const ownedCertificates = await fetchCertificatesByOwnerField(userId);
    const withBlockchainStatus = await hydrateBlockchainStatus(ownedCertificates);

    return withBlockchainStatus.sort((left, right) => {
      const leftDate = new Date(left.issuedOn).getTime();
      const rightDate = new Date(right.issuedOn).getTime();
      return rightDate - leftDate;
    });
  } catch (error: any) {
    console.error('Error getting user certificates:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to load certificates. Please check your connection and try again.'
    );
  }
};

/**
 * Get all certificates in the system (for Admins).
 */
export const getAllCertificates = async (): Promise<Certificate[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    const all = querySnapshot.docs.map((d) => normalizeCertificateRecord(d.data(), d.id));
    return await hydrateBlockchainStatus(all);
  } catch (error) {
    console.error('Error getting all certificates:', error);
    return [];
  }
};

export const getCertificateById = async (id: string): Promise<Certificate | undefined> => {
  if (!db) return undefined;
  try {
    const directDoc = await getDoc(doc(db, CERTIFICATES_COLLECTION, id));
    if (directDoc.exists()) {
      return normalizeCertificateRecord(directDoc.data(), directDoc.id);
    }

    const q = query(collection(db, CERTIFICATES_COLLECTION), where('id', '==', id));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0] ? normalizeCertificateRecord(querySnapshot.docs[0].data(), querySnapshot.docs[0].id) : undefined;
  } catch (error) {
    console.error('Error getting certificate by ID:', error);
    return undefined;
  }
};

export const getCertificateByHash = async (hash: string): Promise<Certificate | undefined> => {
  if (!db) return undefined;
  try {
    const { raw } = normalizeIPFSHash(hash);
    const q = query(collection(db, CERTIFICATES_COLLECTION), where('ipfsHash', '==', raw));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.docs.length > 0) {
      return normalizeCertificateRecord(querySnapshot.docs[0].data(), querySnapshot.docs[0].id);
    }
    return undefined;
  } catch (error) {
    console.error('Error getting certificate by hash:', error);
    return undefined;
  }
};
