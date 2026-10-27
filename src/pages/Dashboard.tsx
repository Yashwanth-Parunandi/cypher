import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { 
  Award, 
  CheckCircle, 
  ChevronRight, 
  Download, 
  Eye, 
  Copy, 
  FileCheck, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  GraduationCap, 
  Building2, 
  Sparkles,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserCertificates, getReceivedCertificates, getAllCertificates } from '@/services/certificateService';
import { Certificate } from '@/types/certificate';
import { useToast } from '@/hooks/use-toast';
import CertificatePreview from '@/components/CertificatePreview';
import { downloadCertificateAsPDF } from '@/utils/downloadUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const certificatePreviewRef = useRef<HTMLDivElement>(null);

  const isIssuerOrAdmin = user?.userType === 'admin' || user?.userType === 'issuer';

  useEffect(() => {
    let isCancelled = false;

    const fetchCertificates = async () => {
      if (!user) return;
      setLoading(true);

      try {
        let certs: Certificate[] = [];
        if (user.userType === 'recipient') {
          // Students / recipients primarily see certificates awarded to their email
          certs = await getReceivedCertificates(user.email);
        } else if (user.userType === 'admin') {
          // Admins can see all certificates across the system
          certs = await getAllCertificates();
        } else {
          // Issuers see certificates they generated
          certs = await getUserCertificates(user.id);
        }

        if (!isCancelled) {
          setCertificates(certs.map((c) => ({
            ...c,
            templateType: c.templateType || 'classic',
          })));
        }
      } catch (error) {
        console.error('Error fetching certificates: ', error);
        if (!isCancelled) {
          toast({
            title: 'Notice',
            description: error instanceof Error
              ? error.message
              : 'Could not load certificates list. Please check your network connection.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCertificates();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast({
        title: 'Copied',
        description: 'Certificate IPFS hash copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenPreview = (cert: Certificate) => {
    // Single modal handler - resolves the conflicting double-dialog bug!
    setSelectedCertificate(cert);
    setShowPreviewModal(true);
  };

  const handleDownload = async () => {
    if (!selectedCertificate || !certificatePreviewRef.current) return;

    setDownloading(true);
    try {
      const success = await downloadCertificateAsPDF(certificatePreviewRef.current, selectedCertificate);
      if (success) {
        toast({
          title: 'Download Successful',
          description: 'Your certificate PDF has been downloaded.',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: 'Could not generate certificate PDF.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: 'Download Failed',
        description: 'An unexpected error occurred while generating PDF.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${cert.firstName} ${cert.lastName}`.toLowerCase();
    const course = (cert.certifiedFor || '').toLowerCase();
    const org = (cert.organization || '').toLowerCase();
    const hash = (cert.ipfsHash || '').toLowerCase();
    return name.includes(q) || course.includes(q) || org.includes(q) || hash.includes(q);
  });

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {user?.userType} Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || 'User'}!
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              {user?.userType === 'recipient' && 'View, verify, and export your tamper-proof credentials backed by Ethereum.'}
              {user?.userType === 'issuer' && 'Issue, track, and manage immutable certificates on the blockchain.'}
              {user?.userType === 'admin' && 'System-wide certificate oversight, smart contract management, and revocation controls.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isIssuerOrAdmin && (
              <Button 
                onClick={() => navigate('/generate')}
                className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-sm"
              >
                <Award className="h-4 w-4 mr-2" />
                Issue Certificate
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/validate')}
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-medium"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Hash
            </Button>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isIssuerOrAdmin && (
            <Card 
              className="glass-card hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 hover:border-indigo-300"
              onClick={() => navigate('/generate')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">
                  Issue New Certificate
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Award className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm min-h-[48px]">
                  Create a new tamper-proof credential with IPFS metadata storage and on-chain timestamping.
                </CardDescription>
                <div className="mt-4 flex justify-between items-center text-xs font-semibold text-indigo-600">
                  <span>Open Generator</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card 
            className={`glass-card hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 hover:border-blue-300 ${!isIssuerOrAdmin ? 'md:col-span-2' : ''}`}
            onClick={() => navigate('/validate')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold text-gray-800">
                Verify Certificate Authenticity
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <FileCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm min-h-[48px]">
                Enter an IPFS CID or cryptographic hash to check smart contract validity and verification records.
              </CardDescription>
              <div className="mt-4 flex justify-between items-center text-xs font-semibold text-blue-600">
                <span>Open Validator</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificates Table & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user?.userType === 'recipient' ? 'My Awarded Certificates' : 'Certificates Catalog'}
              </h2>
              <p className="text-xs text-gray-500">
                {filteredCertificates.length} {filteredCertificates.length === 1 ? 'record' : 'records'} found
              </p>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search recipient, course, org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm text-gray-500">Retrieving certificates and validating on-chain state...</p>
            </div>
          ) : filteredCertificates.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredCertificates.map((cert) => {
                const isRevoked = Boolean(cert.revoked);
                const isBlockchainValid = Boolean(cert.blockchainValid);

                return (
                  <Card key={cert.id} className="hover:border-indigo-200 transition-all shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-base">
                            {cert.firstName} {cert.lastName}
                          </h3>
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            {cert.organization}
                          </Badge>
                          
                          {isRevoked ? (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Revoked
                            </Badge>
                          ) : isBlockchainValid ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 text-xs flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Blockchain Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                              Off-Chain / Pending
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm font-medium text-indigo-700">
                          {cert.certifiedFor}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>Issued: {new Date(cert.issuedOn).toLocaleDateString()}</span>
                          {cert.recipientEmail && <span>Recipient: {cert.recipientEmail}</span>}
                          {cert.ipfsHash && (
                            <button
                              type="button"
                              onClick={() => handleCopyHash(cert.ipfsHash)}
                              className="font-mono text-gray-600 hover:text-indigo-600 flex items-center gap-1"
                              title="Click to copy IPFS CID"
                            >
                              <span>CID: {cert.ipfsHash.slice(0, 10)}...</span>
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPreview(cert)}
                          className="h-8 text-xs flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/certificate/${cert.id}`)}
                          className="h-8 text-xs bg-blue-gradient text-white flex items-center gap-1"
                        >
                          Details
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No certificates found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                {user?.userType === 'recipient'
                  ? 'No certificates have been issued to your registered email address yet.'
                  : 'Start by issuing a new tamper-proof digital certificate.'}
              </p>
              {isIssuerOrAdmin && (
                <Button 
                  onClick={() => navigate('/generate')} 
                  size="sm"
                  className="mt-4 bg-blue-gradient text-white"
                >
                  <Award className="h-4 w-4 mr-1.5" />
                  Issue Certificate
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* SINGLE CONSOLIDATED PREVIEW & DOWNLOAD DIALOG (No overlay clash!) */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-4">
              <div>
                <DialogTitle className="text-xl">Certificate Preview</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Awarded to {selectedCertificate?.firstName} {selectedCertificate?.lastName} for {selectedCertificate?.certifiedFor}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2">
            <div ref={certificatePreviewRef} className="certificate-download-container bg-white rounded-lg p-2">
              {selectedCertificate && (
                <CertificatePreview
                  certificate={selectedCertificate}
                  templateType={selectedCertificate.templateType}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <span>IPFS: {selectedCertificate?.ipfsHash ? `${selectedCertificate.ipfsHash.slice(0, 16)}...` : 'N/A'}</span>
              {selectedCertificate?.ipfsHash && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs" 
                  onClick={() => handleCopyHash(selectedCertificate.ipfsHash)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy Hash
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-gradient text-white flex items-center gap-1.5"
              >
                {downloading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Exporting PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
