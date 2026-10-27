import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCertificateById, revokeCertificate } from '@/services/certificateService';
import { downloadCertificateAsPDF } from '@/utils/downloadUtils';
import { Certificate } from '@/types/certificate';
import { 
  ArrowLeft, 
  Copy, 
  Download, 
  ExternalLink, 
  Info, 
  Share2, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import CertificatePreview from '@/components/CertificatePreview';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getIPFSGatewayUrl } from '@/lib/ipfs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CertificateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCertificate = async () => {
      if (id) {
        try {
          const certResult = await getCertificateById(id);
          if (!cancelled) {
            setCertificate(certResult || null);
          }
        } catch (error) {
          console.error('Error fetching certificate:', error);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }
    };
    
    void fetchCertificate();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyToClipboard = async (text: string, label = 'Content') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: `${label} copied successfully.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async () => {
    if (!certificate || !certificateRef.current) return;
    
    setDownloading(true);
    try {
      const success = await downloadCertificateAsPDF(certificateRef.current, certificate);
      if (success) {
        toast({
          title: 'Certificate Downloaded',
          description: 'Your certificate PDF has been generated and saved.',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: 'Could not export certificate as PDF.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: 'Download Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleRevoke = async () => {
    if (!certificate || !user) return;
    const confirmRevoke = window.confirm(
      'Are you sure you want to revoke this certificate on the blockchain? This action is permanent and cannot be undone.'
    );
    if (!confirmRevoke) return;

    try {
      setIsRevoking(true);
      await revokeCertificate(certificate.id, certificate.ipfsHash, user);
      setCertificate((prev) => prev ? { ...prev, revoked: true, revokedAt: new Date().toISOString(), blockchainValid: false } : null);
      toast({
        title: 'Certificate Revoked',
        description: 'The certificate has been revoked on the smart contract.',
      });
    } catch (err: any) {
      toast({
        title: 'Revocation Failed',
        description: err.message || 'Could not revoke certificate on-chain.',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cypher-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!certificate) {
    return (
      <Layout>
        <div className="text-center py-16 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800">Certificate Not Found</h2>
          <p className="mt-2 text-gray-600 text-sm">The requested credential does not exist or has been removed.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const isExpired = certificate.expiresOn && new Date(certificate.expiresOn) < new Date();
  const isRevoked = Boolean(certificate.revoked);
  const isBlockchainValid = Boolean(certificate.blockchainValid) && !isRevoked;
  const canRevoke = user && (user.userType === 'admin' || (user.userType === 'issuer' && certificate.issuedBy === user.id));
  const verificationUrl = `${window.location.origin}/validate?hash=${certificate.ipfsHash}`;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-cypher-primary hover:underline inline-flex items-center text-sm font-medium mb-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
                Certificate Record
              </h1>
              {isRevoked ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Revoked
                </Badge>
              ) : isExpired ? (
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Expired
                </Badge>
              ) : isBlockchainValid ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Blockchain Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 bg-gray-100">
                  Pending On-Chain
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-1.5 text-xs h-9" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  Exporting...
                </span>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>

            <Button 
              onClick={() => setShowShareModal(true)}
              className="bg-blue-gradient text-white flex items-center gap-1.5 text-xs h-9 hover:opacity-95"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            {canRevoke && !isRevoked && (
              <Button
                variant="destructive"
                className="flex items-center gap-1.5 text-xs h-9"
                onClick={handleRevoke}
                disabled={isRevoking}
              >
                <Trash2 className="h-4 w-4" />
                {isRevoking ? 'Revoking on-chain...' : 'Revoke Certificate'}
              </Button>
            )}
          </div>
        </div>

        {/* Certificate Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div ref={certificateRef} className="certificate-download-container bg-white rounded-lg">
              <CertificatePreview 
                certificate={certificate} 
                templateType={certificate.templateType} 
              />
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900 border-b pb-2">
                  Credential Information
                </h2>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="text-gray-500 font-medium">Recipient</h3>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">
                      {certificate.firstName} {certificate.lastName}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-gray-500 font-medium">Recipient Registered Email</h3>
                    <p className="mt-0.5 text-gray-800 font-mono">{certificate.recipientEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-500 font-medium">Certification Qualification</h3>
                    <p className="mt-0.5 text-sm font-semibold text-indigo-700">{certificate.certifiedFor}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-500 font-medium">Awarding Body</h3>
                    <p className="mt-0.5 text-gray-800 font-medium">{certificate.organization}</p>
                  </div>
                  <div>
                    <h3 className="text-gray-500 font-medium">Date of Issue</h3>
                    <p className="mt-0.5 text-gray-800">{formatDate(certificate.issuedOn)}</p>
                  </div>
                  {certificate.expiresOn && (
                    <div>
                      <h3 className="text-gray-500 font-medium">Expiration Date</h3>
                      <p className={`mt-0.5 font-medium ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatDate(certificate.expiresOn)} {isExpired && '(Expired)'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900 border-b pb-2">
                  Decentralized Ledger Proof
                </h2>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1">IPFS Storage Hash</span>
                    <div className="flex items-center gap-1 bg-gray-100 p-2 rounded font-mono text-[11px] break-all">
                      <span>{certificate.ipfsHash}</span>
                      <button 
                        type="button" 
                        onClick={() => copyToClipboard(certificate.ipfsHash, 'IPFS Hash')}
                        className="ml-auto text-gray-500 hover:text-gray-800 flex-shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex justify-between">
                      <a 
                        href={getIPFSGatewayUrl(certificate.ipfsHash)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cypher-primary hover:underline flex items-center gap-1"
                      >
                        Explore IPFS File <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {certificate.txHash && (
                    <div>
                      <span className="text-gray-500 block mb-1">Blockchain Transaction</span>
                      <div className="flex items-center gap-1 bg-gray-100 p-2 rounded font-mono text-[11px] break-all">
                        <span>{certificate.txHash}</span>
                        <button 
                          type="button" 
                          onClick={() => copyToClipboard(certificate.txHash!, 'Transaction Hash')}
                          className="ml-auto text-gray-500 hover:text-gray-800 flex-shrink-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={`p-3 rounded-lg border flex items-center gap-2 ${
                    isRevoked
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : isBlockchainValid
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {isRevoked ? (
                      <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    ) : isBlockchainValid ? (
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      {isRevoked
                        ? 'Revoked by authority on Ethereum'
                        : isBlockchainValid
                        ? 'Cryptographically validated on Ethereum'
                        : 'Stored in IPFS / Off-chain index'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Digital Credential</DialogTitle>
            <DialogDescription className="text-xs">
              Anyone with this link can inspect and verify this certificate without logging in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Public Verification Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verificationUrl}
                  className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(verificationUrl, 'Verification Link')}
                  className="bg-blue-gradient text-white flex-shrink-0 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                IPFS Content Identifier (CID)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={certificate.ipfsHash}
                  className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded p-2 text-gray-700"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(certificate.ipfsHash, 'IPFS CID')}
                  className="flex-shrink-0 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CertificateDetail;
