import React from 'react';
import { Navigation } from 'lucide-react';
import { RibbonSmallButton } from '../../RibbonSmallButton';

interface ResetNorthProps {
  onClick: (toolId: string) => void;
}

export const ResetNorth: React.FC<ResetNorthProps> = ({ onClick }) => {
  return (
    <RibbonSmallButton 
      icon={<Navigation size={14} className="rotate-0" />} 
      label="Reset North" 
      onClick={() => onClick('reset-north')} 
    />
  );
};
