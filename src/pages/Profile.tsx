import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCertificates, getReceivedCertificates, revokeCertificate } from '@/services/certificateService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Copy, 
  Download, 
  ExternalLink, 
  FileCheck, 
  Info, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Trash2, 
  User, 
  KeyRound, 
  Bell 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from 'react-router-dom';
import { getIPFSGatewayUrl } from '@/lib/ipfs';
import { Certificate } from '@/types/certificate';
import CertificatePreview from '@/components/CertificatePreview';
import { downloadCertificateAsPDF } from '@/utils/downloadUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Profile = () => {
  const { user, updateProfile, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [issuedCertificates, setIssuedCertificates] = useState<Certificate[]>([]);
  const [receivedCertificates, setReceivedCertificates] = useState<Certificate[]>([]);
  const [loadingIssued, setLoadingIssued] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);

  // Modal states
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const defaultTab = user?.userType === 'recipient' ? 'received' : 'issued';

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) return;

      // 1. Load Issued Certificates (if issuer or admin)
      if (user.userType === 'admin' || user.userType === 'issuer') {
        try {
          setLoadingIssued(true);
          const issued = await getUserCertificates(user.id);
          if (!cancelled) setIssuedCertificates(issued);
        } catch (e) {
          console.warn('Error loading issued certs:', e);
        } finally {
          if (!cancelled) setLoadingIssued(false);
        }
      } else {
        setLoadingIssued(false);
      }

      // 2. Load Received Certificates (by email)
      if (user.email) {
        try {
          setLoadingReceived(true);
          const received = await getReceivedCertificates(user.email);
          if (!cancelled) setReceivedCertificates(received);
        } catch (e) {
          console.warn('Error loading received certs:', e);
        } finally {
          if (!cancelled) setLoadingReceived(false);
        }
      } else {
        setLoadingReceived(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'CID copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDownloadPDF = async () => {
    if (!selectedCertificate || !previewContainerRef.current) return;
    setDownloading(true);
    try {
      const ok = await downloadCertificateAsPDF(previewContainerRef.current, selectedCertificate);
      if (ok) {
        toast({ title: 'Success', description: 'Certificate PDF downloaded.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not export PDF.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      setIsUpdatingProfile(true);
      await updateProfile({ fullName: editName.trim() });
      setShowEditProfileDialog(false);
    } catch {
      // Error handled in context
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
    } catch {
      // Handled in context
    }
  };

  const handleRevokeCertificate = async (cert: Certificate) => {
    if (!user) return;
    const ok = window.confirm(`Revoke certificate for ${cert.firstName} ${cert.lastName}? This is permanent on-chain.`);
    if (!ok) return;

    try {
      await revokeCertificate(cert.id, cert.ipfsHash, user);
      setIssuedCertificates((prev) =>
        prev.map((c) => c.id === cert.id ? { ...c, revoked: true, blockchainValid: false } : c)
      );
      toast({ title: 'Revoked', description: 'Certificate has been revoked.' });
    } catch (e: any) {
      toast({ title: 'Revocation Failed', description: e.message, variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold">Please log in</h2>
          <Button onClick={() => navigate('/login')} className="mt-4">Sign In</Button>
        </div>
      </Layout>
    );
  }

  const renderCertificateCard = (cert: Certificate, isIssuedTab: boolean) => {
    const isRevoked = Boolean(cert.revoked);
    const isBlockchainValid = Boolean(cert.blockchainValid) && !isRevoked;
    const isExpired = cert.expiresOn && new Date(cert.expiresOn) < new Date();

    return (
      <Card key={cert.id} className="overflow-hidden border border-gray-200 hover:border-indigo-300 transition-all shadow-sm">
        <div className={`h-1.5 ${isRevoked ? 'bg-red-500' : isBlockchainValid ? 'bg-blue-gradient' : 'bg-amber-400'}`}></div>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {cert.firstName} {cert.lastName}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {cert.organization}
                </Badge>
                {isRevoked ? (
                  <Badge variant="destructive" className="text-[11px] flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Revoked
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="outline" className="text-[11px] text-amber-700 bg-amber-50 border-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Expired
                  </Badge>
                ) : isBlockchainValid ? (
                  <Badge className="bg-green-100 text-green-800 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified On-Chain
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-gray-600 bg-gray-50">
                    Pending
                  </Badge>
                )}
              </div>

              <p className="text-sm font-semibold text-indigo-700">
                {cert.certifiedFor}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span>Issued: {new Date(cert.issuedOn).toLocaleDateString()}</span>
                {cert.recipientEmail && <span>Recipient: {cert.recipientEmail}</span>}
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <span>CID: {cert.ipfsHash.slice(0, 10)}...</span>
                  <button type="button" onClick={() => copyToClipboard(cert.ipfsHash)} className="hover:text-indigo-600">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-col gap-2 self-end md:self-center">
              <Link to={`/certificate/${cert.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  View
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setSelectedCertificate(cert);
                  setShowPreviewModal(true);
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
              <a
                href={getIPFSGatewayUrl(cert.ipfsHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  IPFS
                </Button>
              </a>
              {isIssuedTab && !isRevoked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-red-600 hover:bg-red-50"
                  onClick={() => handleRevokeCertificate(cert)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Revoke
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
            My Account & Credentials
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage your profile details and explore your issued and received certificates.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info & Settings */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <div className="h-14 w-14 rounded-full bg-blue-gradient flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  {getInitials(user.fullName || user.email)}
                </div>
                <div className="overflow-hidden">
                  <CardTitle className="text-lg truncate">{user.fullName || 'User'}</CardTitle>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="border-t border-gray-100 pt-3">
                  <dl className="divide-y divide-gray-100 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-gray-500 font-medium">Role Type</dt>
                      <dd className="font-bold text-indigo-700 uppercase tracking-wider">{user.userType}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-gray-500 font-medium">Received Credentials</dt>
                      <dd className="font-semibold text-gray-800">
                        {loadingReceived ? '...' : receivedCertificates.length}
                      </dd>
                    </div>
                    {(user.userType === 'admin' || user.userType === 'issuer') && (
                      <div className="py-2.5 flex justify-between">
                        <dt className="text-gray-500 font-medium">Issued by You</dt>
                        <dd className="font-semibold text-gray-800">
                          {loadingIssued ? '...' : issuedCertificates.length}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Security & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start text-xs h-9" 
                  variant="outline"
                  onClick={() => {
                    setEditName(user.fullName || '');
                    setShowEditProfileDialog(true);
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile Name
                </Button>
                <Button 
                  className="w-full justify-start text-xs h-9" 
                  variant="outline"
                  onClick={handlePasswordReset}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Send Password Reset Link
                </Button>
                <Button 
                  className="w-full justify-start text-xs h-9 text-gray-400" 
                  variant="outline"
                  disabled
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications (Email Enabled)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Certificates Tabs */}
          <div className="lg:col-span-2">
            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Certificate Repository</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={defaultTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="received">
                      Received ({loadingReceived ? '...' : receivedCertificates.length})
                    </TabsTrigger>
                    {(user.userType === 'admin' || user.userType === 'issuer') && (
                      <TabsTrigger value="issued">
                        Issued ({loadingIssued ? '...' : issuedCertificates.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* RECEIVED CERTIFICATES TAB */}
                  <TabsContent value="received">
                    {loadingReceived ? (
                      <div className="text-center py-12 text-sm text-gray-500 bg-gray-50 rounded-lg">
                        Loading your earned certificates...
                      </div>
                    ) : receivedCertificates.length > 0 ? (
                      <div className="space-y-3">
                        {receivedCertificates.map((cert) => renderCertificateCard(cert, false))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed p-6">
                        <FileCheck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <h4 className="font-semibold text-gray-800 text-sm">No Received Certificates</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                          Certificates issued to your email (<span className="font-mono text-gray-700">{user.email}</span>) will appear here automatically.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ISSUED CERTIFICATES TAB */}
                  {(user.userType === 'admin' || user.userType === 'issuer') && (
                    <TabsContent value="issued">
                      {loadingIssued ? (
                        <div className="text-center py-12 text-sm text-gray-500 bg-gray-50 rounded-lg">
                          Loading issued certificates...
                        </div>
                      ) : issuedCertificates.length > 0 ? (
                        <div className="space-y-3">
                          {issuedCertificates.map((cert) => renderCertificateCard(cert, true))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed p-6">
                          <FileCheck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                          <h4 className="font-semibold text-gray-800 text-sm">No Issued Certificates Yet</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-4">
                            You have not issued any certificates yet.
                          </p>
                          <Link to="/generate">
                            <Button size="sm" className="bg-blue-gradient text-white">
                              Issue Certificate
                            </Button>
                          </Link>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview & Download Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedCertificate?.firstName} {selectedCertificate?.lastName} - {selectedCertificate?.certifiedFor}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2">
            <div ref={previewContainerRef} className="certificate-download-container bg-white p-2 rounded-lg">
              {selectedCertificate && (
                <CertificatePreview
                  certificate={selectedCertificate}
                  templateType={selectedCertificate.templateType}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={downloading} className="bg-blue-gradient text-white">
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile Name</DialogTitle>
            <DialogDescription className="text-xs">
              Update the display name associated with your certificates and account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditProfileDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingProfile} className="bg-blue-gradient text-white">
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Profile;
