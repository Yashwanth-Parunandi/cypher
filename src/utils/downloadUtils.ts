import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Certificate } from '@/types/certificate';

/**
 * Converts a DOM element to a PDF file and downloads it
 * @param element The DOM element to convert
 * @param certificate The certificate data
 */
/**
 * Converts a DOM element to a PDF file and downloads it
 * @param element The DOM element to convert
 * @param certificate The certificate data
 */
export const downloadCertificateAsPDF = async (element: HTMLElement, certificate: Certificate) => {
  if (!element) {
    console.error('No element provided for download');
    return false;
  }

  try {
    console.log('Starting certificate download process...');
    
    // Ensure element is properly rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a styled clone with proper dimensions for certificate layout
    const clone = element.cloneNode(true) as HTMLElement;
    // Set the clone with fixed dimensions positioned behind existing content
    clone.style.position = 'fixed';
    clone.style.top = '0px';
    clone.style.left = '0px';
    clone.style.zIndex = '-9999';
    clone.style.pointerEvents = 'none';
    clone.style.width = '1120px';
    clone.style.minHeight = '792px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.padding = '24px';
    clone.style.boxSizing = 'border-box';
    clone.style.overflow = 'visible';
    clone.style.display = 'block';
    
    // Ensure fonts are rendered
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { font-family: 'Inter', sans-serif; }
    `;
    clone.appendChild(styleElement);
    
    // Append to body and wait a bit for rendering
    document.body.appendChild(clone);
    
    // Force reflow
    clone.getBoundingClientRect();
    
    // Create a canvas from the styled clone
    console.log('Capturing certificate as canvas...');
    const canvas = await html2canvas(clone, {
      scale: 3, // Higher scale for better quality
      useCORS: true, // Allow loading cross-origin images
      allowTaint: true, // Allow loading of tainted canvas
      logging: true, // Enable logging for debugging
      backgroundColor: '#ffffff',
      imageTimeout: 0, // No timeout for images
      onclone: (clonedDoc) => {
        // Make any adjustments to the cloned document if needed
        const clonedElement = clonedDoc.body.querySelector('.certificate-download-container');
        if (clonedElement) {
          // Additional style fixes if needed
          Array.from(clonedElement.querySelectorAll('*')).forEach(el => {
            (el as HTMLElement).style.visibility = 'visible';
            (el as HTMLElement).style.display = getComputedStyle(el).display;
          });
        }
      }
    });
    
    // Remove the cloned element after capturing
    document.body.removeChild(clone);
    
    // Create PDF with proper dimensions
    console.log('Creating PDF...');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Convert canvas to high-quality image
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // A4 size in landscape: 297mm × 210mm
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Center the image on the page with a small margin
    const margin = 5; // 5mm margin
    const usableWidth = pdfWidth - (2 * margin);
    const usableHeight = pdfHeight - (2 * margin);
    
    // Calculate dimensions while preserving aspect ratio
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
    
    // Calculate position to center the image
    const imgX = margin + (usableWidth - imgWidth * ratio) / 2;
    const imgY = margin + (usableHeight - imgHeight * ratio) / 2;
    
    // Add the image to the PDF
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Generate filename
    const recipientName = `${certificate.firstName}_${certificate.lastName}`.replace(/\s+/g, '_');
    const certification = certificate.certifiedFor.replace(/\s+/g, '_');
    const filename = `${recipientName}_${certification}_Certificate.pdf`;

    // Download the PDF with a forced download approach
    console.log('Downloading PDF...');
    try {
      pdf.save(filename);
      console.log('PDF download initiated successfully');
      return true;
    } catch (saveError) {
      console.error('Error saving PDF:', saveError);
      
      // Fallback method for browsers that might block the automatic download
      try {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('PDF downloaded using fallback method');
        return true;
      } catch (fallbackError) {
        console.error('Fallback download method failed:', fallbackError);
        return false;
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
