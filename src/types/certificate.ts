import { CertificateTemplate } from '@/components/templates/TemplateSelector';

export interface CertificateData {
  firstName: string;
  lastName: string;
  organization: string;
  certifiedFor: string;
  assignedDate: string;
  duration?: string;
  recipientEmail: string;
  templateType?: CertificateTemplate;
}

export interface Certificate extends CertificateData {
  id: string;
  ipfsHash: string;
  ipfsUri?: string;
  issuedBy: string;
  issuedOn: string;
  expiresOn?: string;
  blockchainValid?: boolean;
  legacySource?: string;
  txHash?: string;
  ipfsCid?: string;
  revoked?: boolean;
  revokedAt?: string;
}
