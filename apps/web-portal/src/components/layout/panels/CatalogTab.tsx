import React from 'react';
import { CatalogItem } from './CatalogItem';

export const CatalogTab: React.FC = () => (
  <div className="flex flex-col gap-1 text-foreground">
    <CatalogItem label="Project" expanded>
      <div className="ml-4 flex flex-col gap-1 mt-1">
        <CatalogItem label="Maps" />
        <CatalogItem label="Toolboxes" />
        <CatalogItem label="Databases" />
        <CatalogItem label="Styles" />
      </div>
    </CatalogItem>
    <CatalogItem label="Portal" />
    <CatalogItem label="Computer" />
  </div>
);
