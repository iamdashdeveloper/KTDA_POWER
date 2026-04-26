import React, { useState } from 'react';
import { useMapStore, type ProjectFeature } from '@/store/useMapStore';
import { LayerItem } from './LayerItem';
import { useLayout } from '@/context/LayoutContext';
import { useAttributeTableStore } from '@/store/useAttributeTableStore';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { useProjectStore } from '@/store/useProjectStore';
import { Table, ZoomIn, Trash2, Link, Link2Off } from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

export const ContentsTab: React.FC = () => {
  const { setCollapsed } = useLayout();
  const { addTable } = useAttributeTableStore();
  const { 
    layers, toggleLayer, 
    projectFeatures, scratchFeatures, 
    hiddenFeatureIds, triggerRefresh,
    executeCommand
  } = useMapStore();
  const { activeProject } = useProjectStore();
  
  const [contextMenu, setContextMenu] = useState<{ 
    x: number, y: number, 
    layerId: string, layerName: string,
    type: 'project' | 'scratch' | 'system'
  } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const baseLayers = layers.filter(l => l.type === 'base');
  const overlayLayers = layers.filter(l => l.type !== 'base' && l.type !== 'reference' && l.id !== 'project-features');
  const projectLayer = layers.find(l => l.id === 'project-features');
  const referenceLayers = layers.filter(l => l.type === 'reference');

  // Group features by groupName
  const projectGroups: Record<string, ProjectFeature[]> = {};
  projectFeatures.forEach(f => {
    const groupName = f.groupName || 'Other Features';
    if (!projectGroups[groupName]) projectGroups[groupName] = [];
    projectGroups[groupName].push(f);
  });

  const scratchGroups: Record<string, ProjectFeature[]> = {};
  scratchFeatures.forEach(f => {
    const groupName = f.groupName || 'Scratch Layer';
    if (!scratchGroups[groupName]) scratchGroups[groupName] = [];
    scratchGroups[groupName].push(f);
  });

  const handleContextMenu = (e: React.MouseEvent, layerId: string, layerName: string, type: 'project' | 'scratch' | 'system' = 'system') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, layerId, layerName, type });
  };

  const openAttributeTable = (id: string, name: string) => {
    addTable(id, name);
    setCollapsed('bottom', false);
  };

  const getTargetId = (layerName: string, features: ProjectFeature[]) => {
    const groupFeatures = features.filter(f => (f.groupName || 'Other Features') === layerName || (f.groupName || 'Scratch Layer') === layerName);
    return groupFeatures[0]?.groupId || (groupFeatures.length === 1 ? groupFeatures[0].id : null);
  };

  const handleDeletePermanently = async (layerName: string, features: ProjectFeature[]) => {
    const targetId = getTargetId(layerName, features);
    if (!targetId) {
      toast.error("Could not find a valid ID to delete.");
      return;
    }

    setAlertConfig({
      open: true,
      title: "Permanently delete layer?",
      description: `This will completely remove "${layerName}" from the database. This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await ApiClient.delete(`/features/${targetId}`);
          
          const scratchIds = JSON.parse(localStorage.getItem('scratch_layers') || '[]');
          const filtered = scratchIds.filter((id: string) => id !== targetId);
          localStorage.setItem('scratch_layers', JSON.stringify(filtered));

          toast.success(`"${layerName}" deleted permanently`);
          triggerRefresh();
        } catch (error: any) {
          toast.error(error.message || "Failed to delete layer");
        }
      }
    });
  };

  const handleDetachFromProject = async (layerName: string) => {
    const targetId = getTargetId(layerName, projectFeatures);
    if (!targetId) return;

    setAlertConfig({
      open: true,
      title: "Detach from project?",
      description: `"${layerName}" will be moved to Independent Layers and won't be tied to this project anymore.`,
      onConfirm: async () => {
        try {
          await ApiClient.put(`/features/${targetId}`, { projectId: null });
          
          const scratchIds = JSON.parse(localStorage.getItem('scratch_layers') || '[]');
          if (!scratchIds.includes(targetId)) {
            scratchIds.push(targetId);
            localStorage.setItem('scratch_layers', JSON.stringify(scratchIds));
          }

          toast.success(`"${layerName}" moved to Independent Layers`);
          triggerRefresh();
        } catch (error: any) {
          toast.error("Failed to detach from project");
        }
      }
    });
  };

  const handleAttachToProject = async (layerName: string) => {
    if (!activeProject) {
      toast.error("Select a project first");
      return;
    }

    const targetId = getTargetId(layerName, scratchFeatures);
    if (!targetId) return;

    try {
      await ApiClient.put(`/features/${targetId}`, { projectId: activeProject.id });
      
      // Remove from local scratch list
      const scratchIds = JSON.parse(localStorage.getItem('scratch_layers') || '[]');
      const filtered = scratchIds.filter((id: string) => id !== targetId);
      localStorage.setItem('scratch_layers', JSON.stringify(filtered));

      toast.success(`"${layerName}" associated with ${activeProject.name}`);
      triggerRefresh();
    } catch (error: any) {
      toast.error("Failed to attach to project");
    }
  };

  const handleRemoveSystemLayer = (layerId: string, layerName: string) => {
    setAlertConfig({
      open: true,
      title: "Remove from view?",
      description: `Remove "${layerName}" from the map contents? You can add it back from the Catalog.`,
      onConfirm: () => {
        const { removeLayer } = useMapStore.getState();
        removeLayer(layerId);
      }
    });
  };

  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    const items: ContextMenuItem[] = [
      { 
        label: 'Zoom to Layer', 
        icon: <ZoomIn size={12} />, 
        onClick: () => executeCommand('zoom-to-layer', { 
          id: contextMenu.layerId, 
          name: contextMenu.layerName,
          type: contextMenu.type
        }) 
      },
      { label: 'Attribute Table', icon: <Table size={12} />, onClick: () => openAttributeTable(contextMenu.layerId, contextMenu.layerName) },
    ];

    if (contextMenu.type === 'project') {
      items.push(
        { label: 'Detach from Project', icon: <Link2Off size={12} />, onClick: () => handleDetachFromProject(contextMenu.layerName) },
        { label: 'Delete Permanently', icon: <Trash2 size={12} />, variant: 'danger', onClick: () => handleDeletePermanently(contextMenu.layerName, projectFeatures) }
      );
    } else if (contextMenu.type === 'scratch') {
      items.push(
        { label: 'Associate with Project', icon: <Link size={12} />, onClick: () => handleAttachToProject(contextMenu.layerName) },
        { label: 'Delete Permanently', icon: <Trash2 size={12} />, variant: 'danger', onClick: () => handleDeletePermanently(contextMenu.layerName, scratchFeatures) }
      );
    } else {
      items.push(
        { label: 'Remove from View', icon: <Trash2 size={12} />, variant: 'danger', onClick: () => handleRemoveSystemLayer(contextMenu.layerId, contextMenu.layerName) }
      );
    }

    return items;
  };

  return (
    <div className="flex flex-col gap-2 relative">
       <AlertDialog 
         open={alertConfig.open} 
         onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
       >
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
             <AlertDialogDescription>
               {alertConfig.description}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={alertConfig.onConfirm}
               className={alertConfig.variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
             >
               Continue
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       {contextMenu && (
         <ContextMenu 
           x={contextMenu.x} 
           y={contextMenu.y} 
           onClose={() => setContextMenu(null)}
           items={getContextMenuItems()}
         />
       )}
       
       <div className="flex flex-col gap-1">
         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">Project Layers</span>
         
         {projectLayer && (
           <LayerItem 
             label={projectLayer.name} 
             active={projectLayer.visible} 
             onChange={() => toggleLayer(projectLayer.id)}
             onContextMenu={(e) => handleContextMenu(e, projectLayer.id, projectLayer.name)}
             expanded={projectLayer.visible && Object.keys(projectGroups).length > 0}
           >
             <div className="ml-4 flex flex-col gap-1 mt-1 border-l border-border/50 pl-2">
               {Object.entries(projectGroups).map(([groupName, features]) => {
                 const isGroupVisible = features.some(f => !hiddenFeatureIds.has(f.id));
                 return (
                   <LayerItem 
                     key={groupName} 
                     label={`${groupName}`} 
                     active={isGroupVisible} 
                     onChange={() => {
                       const { toggleGroupVisibility } = useMapStore.getState();
                       toggleGroupVisibility(groupName);
                     }} 
                     onContextMenu={(e) => handleContextMenu(e, `group-${groupName}`, groupName, 'project')}
                   />
                 );
               })}
             </div>
           </LayerItem>
         )}

         {overlayLayers.map(layer => (
           <LayerItem 
             key={layer.id} 
             label={layer.name} 
             active={layer.visible} 
             onChange={() => toggleLayer(layer.id)} 
             onContextMenu={(e) => handleContextMenu(e, layer.id, layer.name)}
           />
         ))}
       </div>

       {Object.keys(scratchGroups).length > 0 && (
         <>
           <div className="h-px bg-border/50 my-2" />
           <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">Independent Layers</span>
             {Object.entries(scratchGroups).map(([groupName, features]) => {
               const isGroupVisible = features.some(f => !hiddenFeatureIds.has(f.id));
               return (
                 <LayerItem 
                   key={groupName} 
                   label={`${groupName}`} 
                   active={isGroupVisible} 
                   onChange={() => {
                     const { toggleGroupVisibility } = useMapStore.getState();
                     toggleGroupVisibility(groupName);
                   }} 
                   onContextMenu={(e) => handleContextMenu(e, `scratch-${groupName}`, groupName, 'scratch')}
                 />
               );
             })}
           </div>
         </>
       )}
       
       <div className="h-px bg-border/50 my-2" />
       
       <div className="flex flex-col gap-1">
         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">Basemaps</span>
         {baseLayers.map(layer => (
           <LayerItem 
             key={layer.id} 
             label={layer.name} 
             active={layer.visible} 
             onChange={() => toggleLayer(layer.id)} 
           />
         ))}
         {referenceLayers.map(layer => (
           <LayerItem 
             key={layer.id} 
             label={layer.name} 
             active={layer.visible} 
             onChange={() => toggleLayer(layer.id)} 
           />
         ))}
       </div>
    </div>
  );
};
