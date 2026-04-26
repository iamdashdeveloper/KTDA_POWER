import React from 'react';
import { TbZoomInArea } from "react-icons/tb";
import { RibbonSmallButton } from '../../RibbonSmallButton';

interface ZoomBoxProps {
  onClick: (toolId: string) => void;
}

export const ZoomBox: React.FC<ZoomBoxProps> = ({ onClick }) => {
  return (
    <RibbonSmallButton 
      icon={<TbZoomInArea size={14} />} 
      label="Zoom Box" 
      onClick={() => onClick('zoom-box')} 
    />
  );
};
