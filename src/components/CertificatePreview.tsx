import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Certificate, CertificateData } from '@/types/certificate';
import { User } from '@/types/user';
import { FileCheck } from 'lucide-react';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import MinimalistTemplate from './templates/MinimalistTemplate';
import { CertificateTemplate } from './templates/TemplateSelector';
// Import certificate PDF styles
import '@/styles/certificate-pdf.css';

interface CertificatePreviewProps {
  certificate?: Certificate | null;
  preview?: CertificateData;
  user?: User | null;
  templateType?: CertificateTemplate;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  certificate,
  preview,
  user,
  templateType,
}) => {
  // Use either the actual certificate or the preview data
  const data = certificate || preview;
  
  if (!data) {
    return (
      <Card className="glass-card h-full flex items-center justify-center">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <FileCheck className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Certificate Preview</h3>
          <p className="text-sm text-gray-500">
            Fill out the form to see a preview of your certificate here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get name from data
  const fullName = `${data.firstName} ${data.lastName}`;
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const assignedDate = data.assignedDate ? formatDate(data.assignedDate) : 'N/A';
  const issuedDate = certificate?.issuedOn ? formatDate(certificate.issuedOn) : assignedDate;

  const renderTemplate = () => {
    if (!data) return null;
    
    // Use templateType from props, or if it's not provided, use the one from the certificate
    const template = templateType || (certificate?.templateType as CertificateTemplate);
    
    switch (template) {
      case 'modern':
        return <ModernTemplate data={data} certificate={certificate} />;
      case 'minimalist':
        return <MinimalistTemplate data={data} certificate={certificate} />;
      case 'classic':
        return <ClassicTemplate data={data} certificate={certificate} />;
      default:
        // If no template is specified anywhere, only then default to classic
        return <ClassicTemplate data={data} certificate={certificate} />;
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-gradient"></div>
      <CardContent className="p-8">
        {data ? (
          renderTemplate()
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileCheck className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Certificate Preview</h3>
            <p className="text-sm text-gray-500">
              Fill out the form to see a preview of your certificate here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CertificatePreview;
