import React from 'react';
import { Clipboard, Copy, Scissors } from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';
import { RibbonSmallButton } from '../RibbonSmallButton';

interface MapClipboardToolbarProps {
  onToolClick: (toolId: string) => void;
}

export const MapClipboardToolbar: React.FC<MapClipboardToolbarProps> = ({ onToolClick }) => {
  return (
    <RibbonGroup label="Clipboard">
      <RibbonButton icon={<Clipboard size={20} />} label="Paste" onClick={() => onToolClick('paste')} />
      <div className="flex flex-col gap-1">
        <RibbonSmallButton icon={<Copy size={14} />} label="Copy" onClick={() => onToolClick('copy')} />
        <RibbonSmallButton icon={<Scissors size={14} />} label="Cut" onClick={() => onToolClick('cut')} />
      </div>
    </RibbonGroup>
  );
};
