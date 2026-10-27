import React from 'react';
import { Certificate, CertificateData } from '@/types/certificate';
import Logo from '../Logo';

interface MinimalistTemplateProps {
  data: Certificate | CertificateData;
  certificate?: Certificate | null;
}

const MinimalistTemplate: React.FC<MinimalistTemplateProps> = ({ data, certificate }) => {
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

  return (
    <div className="certificate-template max-w-2xl mx-auto p-8 bg-white shadow-sm border border-gray-100 rounded-sm">
      <div className="certificate-header mb-8 flex justify-between items-center">
        <Logo size="sm" showText={true} />
        <div className="text-xs text-right text-gray-400">
          {certificate && (
            <div>ID: <span className="font-mono">{certificate.id.substring(0, 6)}</span></div>
          )}
        </div>
      </div>
      
      <div className="text-center mb-12">
        <h1 className="certificate-title text-2xl font-light tracking-wide uppercase text-gray-800">
          Certificate of Excellence
        </h1>
      </div>
      
      <div className="text-center mb-12 space-y-6">
        <div className="certificate-recipient">
          <h2 className="text-3xl font-light text-gray-900">{fullName}</h2>
          <div className="w-12 h-px bg-gray-300 mx-auto mt-2"></div>
        </div>
        
        <p className="text-lg text-gray-600 mt-4">
          has successfully completed
        </p>
        
        <h3 className="text-2xl font-medium text-gray-800">
          {data.certifiedFor}
        </h3>
        
        <div className="mt-6">
          <p className="certificate-date text-sm text-gray-500">
            Awarded on {issuedDate} by
          </p>
          <p className="certificate-issuer text-base text-gray-700 font-medium">
            {data.organization}
          </p>
        </div>
      </div>
      
      <div className="certificate-footer mt-16 grid grid-cols-2 gap-8">
        <div className="certificate-signature text-center">
          <div className="signature-line w-24 h-px bg-gray-300 mx-auto mb-2"></div>
          <p className="certificate-signature-label text-xs uppercase tracking-wide text-gray-500">Issuer Signature</p>
        </div>
        
        <div className="certificate-signature text-center">
          <div className="signature-line w-24 h-px bg-gray-300 mx-auto mb-2"></div>
          <p className="certificate-signature-label text-xs uppercase tracking-wide text-gray-500">Recipient Signature</p>
        </div>
      </div>
      
      {certificate && (
        <div className="certificate-verification-info mt-12 pt-2 text-center">
          <div className="certificate-verification inline-flex items-center space-x-1 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            <span>Blockchain Verified</span>
            {certificate.ipfsHash && (
              <span className="font-mono ml-2">{certificate.ipfsHash.substring(0, 6)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MinimalistTemplate;
