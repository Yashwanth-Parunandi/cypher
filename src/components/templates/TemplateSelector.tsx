import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type CertificateTemplate = 'classic' | 'modern' | 'minimalist';

interface TemplateSelectorProps {
  selectedTemplate: CertificateTemplate;
  onSelectTemplate: (template: CertificateTemplate) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
}) => {
  return (
    <Card className="glass-card">
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium mb-4">Choose a Certificate Template</h3>
        
        <RadioGroup 
          value={selectedTemplate} 
          onValueChange={(value) => onSelectTemplate(value as CertificateTemplate)}
          className="space-y-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="classic" id="classic" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="classic" className="font-medium">Classic</Label>
              <div className="w-full h-20 bg-blue-50 border border-blue-100 rounded-md mt-2 overflow-hidden flex items-center justify-center">
                <div className="text-xs text-blue-500 font-medium px-2 py-1 bg-blue-100 rounded">Classic Certificate Design</div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Traditional certificate design with formal elements and layout.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="modern" id="modern" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="modern" className="font-medium">Modern</Label>
              <div className="w-full h-20 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-md mt-2 overflow-hidden flex items-center justify-center">
                <div className="text-xs text-purple-500 font-medium px-2 py-1 bg-purple-100 rounded">Modern Certificate Design</div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Contemporary design with gradient accents and modern typography.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="minimalist" id="minimalist" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="minimalist" className="font-medium">Minimalist</Label>
              <div className="w-full h-20 bg-gray-50 border border-gray-100 rounded-md mt-2 overflow-hidden flex items-center justify-center">
                <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded">Minimalist Certificate Design</div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Clean, simple design with focus on content and minimal decorative elements.</p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default TemplateSelector;
