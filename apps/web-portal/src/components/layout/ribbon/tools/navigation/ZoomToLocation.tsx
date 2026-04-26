import React from 'react';
import { MapPin } from 'lucide-react';
import { RibbonSmallButton } from '../../RibbonSmallButton';

interface ZoomToLocationProps {
  onClick: (toolId: string) => void;
}

export const ZoomToLocation: React.FC<ZoomToLocationProps> = ({ onClick }) => {
  return (
    <RibbonSmallButton 
      icon={<MapPin size={14} />} 
      label="My Location" 
      onClick={() => onClick('zoom-to-location')} 
    />
  );
};
