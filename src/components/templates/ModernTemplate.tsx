import React from 'react';
import { Certificate, CertificateData } from '@/types/certificate';
import Logo from '../Logo';

interface ModernTemplateProps {
  data: Certificate | CertificateData;
  certificate?: Certificate | null;
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ data, certificate }) => {
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
    <div className="certificate-template max-w-2xl mx-auto rounded-lg p-8 bg-gradient-to-br from-blue-50 to-white shadow-xl">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
      <div className="certificate-header flex justify-between items-center mb-8">
        <Logo size="md" showText={true} />
        <div className="text-xs text-right text-gray-500">
          {certificate && (
            <div>Certificate ID: <span className="font-mono">{certificate.id.substring(0, 8)}...</span></div>
          )}
          {certificate?.ipfsHash && (
            <div>IPFS: <span className="font-mono">{certificate.ipfsHash.substring(0, 8)}...</span></div>
          )}
        </div>
      </div>
      
      <div className="text-center mb-10">
        <div className="mb-6">
          <span className="certificate-verification inline-block px-4 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
            Blockchain Verified
          </span>
        </div>
        <h1 className="certificate-title text-3xl font-bold text-blue-600 uppercase tracking-wider">
          Certificate of Excellence
        </h1>
      </div>
      
      <div className="text-center mb-10 px-8">
        <p className="text-gray-600 mb-4">This certifies that</p>
        <div className="certificate-recipient">
          <h2 className="text-4xl font-bold mb-1 text-gray-800">{fullName}</h2>
          <div className="w-16 h-1 bg-blue-500 mx-auto my-3"></div>
        </div>
        <p className="text-gray-600 mb-4 mt-6">has successfully completed</p>
        <h3 className="text-2xl font-semibold text-blue-600 mb-6">
          {data.certifiedFor}
        </h3>
        <p className="certificate-date">
          Awarded on {issuedDate} by
        </p>
        <p className="certificate-issuer font-semibold text-gray-800 text-lg mt-1">
          {data.organization}
        </p>
      </div>
      
      <div className="certificate-footer flex justify-between items-end mt-10 pt-6 border-t border-gray-200">
        <div className="certificate-signature text-center">
          <div className="signature-line w-32 border-b border-gray-400 mb-2"></div>
          <p className="certificate-signature-label text-sm text-gray-600">Issuer Signature</p>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full bg-blue-50 mb-2">
            <img src="/logo.png" alt="Seal" className="h-12 w-12 object-contain" />
          </div>
          <span className="text-xs text-gray-500 text-center">Verified by {data.organization || 'Cypher Authority'}</span>
        </div>
        
        <div className="certificate-signature text-center">
          <div className="signature-line w-32 border-b border-gray-400 mb-2"></div>
          <p className="certificate-signature-label text-sm text-gray-600">Recipient Signature</p>
        </div>
      </div>
      
      {certificate && (
        <div className="certificate-verification-info mt-8 pt-4 text-center">
          <p className="text-xs text-gray-500">
            This certificate's authenticity can be verified online using the IPFS hash.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModernTemplate;
