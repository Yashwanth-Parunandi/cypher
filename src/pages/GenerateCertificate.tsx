import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateCertificate } from '@/services/certificateService';
import { useAuth } from '@/contexts/AuthContext';
import { CertificateData } from '@/types/certificate';
import CertificatePreview from '@/components/CertificatePreview';
import MetaMaskButton from '@/components/MetaMaskButton';
import TemplateSelector, { CertificateTemplate } from '@/components/templates/TemplateSelector';
import { ShieldAlert, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GenerateCertificate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate>('classic');
  
  const [formData, setFormData] = useState<CertificateData>({
    firstName: '',
    lastName: '',
    organization: '',
    certifiedFor: '',
    assignedDate: new Date().toISOString().split('T')[0],
    duration: '1',
    recipientEmail: '',
  });

  // Role Gate: Only Admin or Issuer can issue certificates
  if (user && user.userType === 'recipient') {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-12 text-center">
          <Card className="border-amber-200 bg-amber-50/50 p-6">
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 text-amber-600 mx-auto mb-2" />
              <CardTitle className="text-xl text-amber-900">Issuer Privilege Required</CardTitle>
              <CardDescription className="text-amber-700">
                Your account is currently registered as a <strong>Student / Recipient</strong>. Only recognized Institutions and Administrators can mint digital certificates on the blockchain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-blue-gradient text-white"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to generate certificates.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isMetaMaskConnected) {
      toast({
        title: 'MetaMask Required',
        description: 'Please connect your Web3 wallet to authorize the on-chain minting transaction.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      const generatedCertificate = await generateCertificate(
        { ...formData, templateType: selectedTemplate }, 
        user
      );
      setCertificate(generatedCertificate);
      
      toast({
        title: 'Certificate Minted Successfully',
        description: `Tx: ${generatedCertificate.txHash ? generatedCertificate.txHash.slice(0, 10) + '...' : 'Recorded'}`,
      });
    } catch (error: any) {
      console.error('Generation Error:', error);
      toast({
        title: 'Minting Failed',
        description: error.message || 'Smart contract rejected the transaction. Verify that your connected wallet has admin authorization.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
              Certificate Minting Studio
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Issue tamper-proof academic or professional credentials anchored on Ethereum
            </p>
          </div>
          <MetaMaskButton onConnect={() => setIsMetaMaskConnected(true)} />
        </header>

        {certificate && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 text-sm">Certificate Successfully Issued!</h4>
                <p className="text-xs text-green-700">
                  IPFS CID: <span className="font-mono">{certificate.ipfsHash}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="bg-white text-xs"
                onClick={() => navigate(`/certificate/${certificate.id}`)}
              >
                View Certificate Record <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Certificate Form */}
          <Card className="glass-card order-2 lg:order-1">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="mb-6">
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Recipient First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Recipient Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Awarding Institution / Organization</Label>
                  <Input
                    id="organization"
                    name="organization"
                    placeholder="Cypher Global University"
                    value={formData.organization}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifiedFor">Certification Title / Course</Label>
                  <Input
                    id="certifiedFor"
                    name="certifiedFor"
                    placeholder="Full Stack Blockchain Development"
                    value={formData.certifiedFor}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedDate">Issue Date</Label>
                    <Input
                      id="assignedDate"
                      name="assignedDate"
                      type="date"
                      value={formData.assignedDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Validity Duration (Years, optional)</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="1 (Leave blank for no expiration)"
                      value={formData.duration}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient Registered Email</Label>
                  <Input
                    id="recipientEmail"
                    name="recipientEmail"
                    type="email"
                    placeholder="student@example.com"
                    value={formData.recipientEmail}
                    onChange={handleInputChange}
                    required
                  />
                  <p className="text-[11px] text-gray-500">
                    The student can access this certificate automatically when logging in with this email.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-gradient text-white hover:opacity-95"
                  disabled={isGenerating || !isMetaMaskConnected}
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Recording on Ethereum & IPFS...
                    </span>
                  ) : (
                    'Mint & Issue Certificate'
                  )}
                </Button>
                
                {!isMetaMaskConnected && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    ⚠️ Connect your MetaMask wallet using the button above to sign the smart contract issuance.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Real-time Certificate Preview */}
          <div className="order-1 lg:order-2 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Live Visual Preview</span>
              <span>Template: {selectedTemplate}</span>
            </div>
            <CertificatePreview
              certificate={certificate}
              preview={!certificate ? formData : undefined}
              user={user}
              templateType={selectedTemplate}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GenerateCertificate;
