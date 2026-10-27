import React from 'react';
import { Certificate, CertificateData } from '@/types/certificate';
import Logo from '../Logo';

interface ClassicTemplateProps {
  data: Certificate | CertificateData;
  certificate?: Certificate | null;
}

const ClassicTemplate: React.FC<ClassicTemplateProps> = ({ data, certificate }) => {
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
    <div className="certificate-template max-w-2xl mx-auto border-4 border-blue-100 rounded-lg p-8 bg-white shadow-lg">
      <div className="certificate-header flex justify-between items-center mb-6">
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
      
      {certificate && (
        <div className="mb-4 text-center">
          <span className="certificate-verification inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
            Blockchain Verified
          </span>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h1 className="certificate-title text-2xl font-bold text-indigo-600 uppercase tracking-wider">
          CERTIFICATE OF EXCELLENCE
        </h1>
      </div>
      
      <div className="text-center mb-8">
        <p className="text-gray-600 mb-4">This certifies that</p>
        <div className="certificate-recipient">
          <h2 className="text-3xl font-bold mb-1">{fullName}</h2>
          <div className="w-24 h-1 bg-indigo-500 mx-auto"></div>
        </div>
        <p className="text-gray-600 mb-6 mt-6">has successfully completed</p>
        <h3 className="text-2xl font-semibold text-blue-600 mb-6">
          {data.certifiedFor}
        </h3>
        <p className="certificate-date">
          Awarded on {issuedDate} by
        </p>
        <p className="certificate-issuer">
          {data.organization}
        </p>
      </div>
      
      <div className="certificate-footer flex flex-col items-center mt-12">
        <div className="w-full flex justify-between items-center">
          <div className="flex-1"></div>
          <div className="px-4 flex flex-col items-center gap-2">
            <img src="/image.png" alt="Seal" className="h-16" />
            <span className="font-medium text-base text-center">Verified by {data.organization || 'Cypher Authority'}</span>
          </div>
          <div className="flex-1"></div>
        </div>
        <div className="flex justify-between w-full mt-4 text-sm text-gray-600">
          <div className="certificate-signature text-center flex-1">
            <div className="signature-line w-24 border-t border-gray-400 mx-auto"></div>
            <p className="certificate-signature-label mt-2">Issuer Signature</p>
          </div>
          <div className="certificate-signature text-center flex-1">
            <div className="signature-line w-24 border-t border-gray-400 mx-auto"></div>
            <p className="certificate-signature-label mt-2">Recipient Signature</p>
          </div>
        </div>
      </div>
      
      {certificate && (
        <div className="certificate-verification-info mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            This certificate's authenticity can be verified online using the IPFS hash.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClassicTemplate;
