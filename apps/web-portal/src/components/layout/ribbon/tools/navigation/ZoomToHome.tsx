import React from 'react';
import { TbZoomPanFilled } from "react-icons/tb";
import { RibbonSmallButton } from '../../RibbonSmallButton';

interface ZoomToHomeProps {
  onClick: (toolId: string) => void;
}

export const ZoomToHome: React.FC<ZoomToHomeProps> = ({ onClick }) => {
  return (
    <RibbonSmallButton 
      icon={<TbZoomPanFilled size={14} />} 
      label="Zoom To Project" 
      onClick={() => onClick('zoom-home')} 
    />
  );
};
