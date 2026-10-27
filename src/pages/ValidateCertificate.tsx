import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { validateCertificate } from '@/services/certificateService';
import { Certificate } from '@/types/certificate';
import CertificatePreview from '@/components/CertificatePreview';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  ExternalLink, 
  Copy, 
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { getIPFSGatewayUrl } from '@/lib/ipfs';

const ValidateCertificate = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [hash, setHash] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    blockchainValid: boolean;
    isRevoked: boolean;
    revokedAt?: string;
  } | null>(null);

  const queryHash = searchParams.get('hash') || searchParams.get('cid');

  const executeValidation = async (targetHash: string) => {
    if (!targetHash.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide a valid IPFS CID or certificate hash.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsValidating(true);
      setValidationResult(null);
      setCertificate(null);

      const result = await validateCertificate(targetHash.trim());

      setValidationResult({
        isValid: result.isValid,
        message: result.message,
        blockchainValid: result.blockchainValid,
        isRevoked: result.isRevoked,
        revokedAt: result.revokedAt,
      });

      if (result.certificate) {
        setCertificate(result.certificate);
      }

      if (result.isValid) {
        toast({
          title: 'Certificate Verified',
          description: 'The certificate is verified and active on the blockchain.',
        });
      } else if (result.isRevoked) {
        toast({
          title: 'Certificate Revoked',
          description: 'This credential was formally revoked on-chain by the issuing authority.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Validation Notice',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message || 'Could not complete verification.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (queryHash) {
      setHash(queryHash);
      void executeValidation(queryHash);
    }
  }, [queryHash]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeValidation(hash);
  };

  const sampleHash = 'QmfMcnU2nYp9zHmVMYJSeYysmwq55kCvpyMWybwQZqNScV';

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
        <header className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            Public Cryptographic Verification
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-2">
            Verify Certificate Authenticity
          </h1>
          <p className="text-gray-600 text-sm">
            Instant decentralized validation against Ethereum smart contracts and IPFS immutable records.
          </p>
        </header>

        {/* Validation Input Card */}
        <Card className="glass-card max-w-3xl mx-auto shadow-md border-slate-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="cert-hash" className="block text-sm font-semibold text-gray-800 mb-1">
                  Certificate IPFS Hash or Transaction Identifier
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="cert-hash"
                      type="text"
                      className="w-full pl-3 pr-8 font-mono text-xs sm:text-sm"
                      placeholder="e.g. QmfMcnU2nYp9zHmVMYJSeYysmwq55kCvpyMWybwQZqNScV"
                      value={hash}
                      onChange={(e) => setHash(e.target.value)}
                    />
                    {hash && (
                      <button
                        type="button"
                        onClick={() => setHash('')}
                        className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="bg-blue-gradient text-white flex-shrink-0"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <span className="flex items-center gap-1.5">
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Search className="h-4 w-4" />
                        Verify
                      </span>
                    )}
                  </Button>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                  <span>Any employer or third-party can verify credentials freely without creating an account.</span>
                  <button
                    type="button"
                    onClick={() => { setHash(sampleHash); void executeValidation(sampleHash); }}
                    className="text-cypher-primary hover:underline font-medium"
                  >
                    Use Sample Hash
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Verification Result Section */}
        {validationResult && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Status Banner */}
            <div className={`p-5 rounded-xl border flex items-start gap-4 ${
              validationResult.isValid
                ? 'bg-green-50 border-green-200 text-green-900'
                : validationResult.isRevoked
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {validationResult.isValid ? (
                <ShieldCheck className="h-8 w-8 text-green-600 flex-shrink-0 mt-0.5" />
              ) : validationResult.isRevoked ? (
                <ShieldAlert className="h-8 w-8 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0 mt-0.5" />
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">
                    {validationResult.isValid
                      ? 'Authentic & Blockchain Verified'
                      : validationResult.isRevoked
                      ? 'Certificate Has Been Revoked'
                      : 'Verification Incomplete or Expired'}
                  </h3>
                </div>
                <p className="text-sm">
                  {validationResult.message}
                </p>
                {validationResult.isRevoked && validationResult.revokedAt && (
                  <p className="text-xs text-red-700 font-medium">
                    Revocation Timestamp: {new Date(validationResult.revokedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Certificate Details & Preview */}
            {certificate && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <CertificatePreview
                    certificate={certificate}
                    templateType={certificate.templateType || 'classic'}
                  />
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <Card className="glass-card">
                    <CardContent className="p-5 space-y-4">
                      <h4 className="font-bold text-gray-900 text-sm border-b pb-2">
                        On-Chain Metadata
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-gray-500 block">Recipient</span>
                          <span className="font-semibold text-gray-900 text-sm">
                            {certificate.firstName} {certificate.lastName}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 block">Course / Qualification</span>
                          <span className="font-medium text-gray-900">
                            {certificate.certifiedFor}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 block">Awarding Organization</span>
                          <span className="font-medium text-gray-900">
                            {certificate.organization}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 block">Issued Date</span>
                          <span className="font-medium text-gray-900">
                            {new Date(certificate.issuedOn).toLocaleDateString()}
                          </span>
                        </div>

                        {certificate.expiresOn && (
                          <div>
                            <span className="text-gray-500 block">Expiration</span>
                            <span className="font-medium text-gray-900">
                              {new Date(certificate.expiresOn).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <span className="text-gray-500 block mb-1">IPFS Immutable CID</span>
                          <div className="flex items-center gap-1 bg-gray-100 p-2 rounded text-[11px] font-mono break-all">
                            <span>{certificate.ipfsHash}</span>
                          </div>
                          <a
                            href={getIPFSGatewayUrl(certificate.ipfsHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-cypher-primary hover:underline text-xs flex items-center gap-1"
                          >
                            View Raw IPFS Payload <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ValidateCertificate;
