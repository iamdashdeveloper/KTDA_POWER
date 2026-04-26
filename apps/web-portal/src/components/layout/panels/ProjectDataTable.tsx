import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Search, Download, Filter } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { loadProjectFeatures, loadProjectIssues } from '@/lib/mapData';
import { cn } from "@workspace/ui/lib/utils";

interface ProjectDataTableProps {
  layerId: string;
  layerName: string;
}

export const ProjectDataTable: React.FC<ProjectDataTableProps> = ({ layerId, layerName }) => {
  const activeProject = useProjectStore(state => state.activeProject);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProject) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let results = [];
        if (layerId === 'project-features') {
          results = await loadProjectFeatures(activeProject.id);
        } else if (layerId === 'project-issues') {
          results = await loadProjectIssues(activeProject.id);
        } else if (layerId.startsWith('group-')) {
          const groupName = layerId.replace('group-', '');
          const all = await loadProjectFeatures(activeProject.id);
          results = all.filter(f => (f.groupName || 'Other Features') === groupName);
        }
        setData(results);
      } catch (err) {
        setError('Failed to load layer data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeProject, layerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="text-[11px] font-medium">Querying {layerName}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <AlertCircle size={24} />
        <span className="text-[11px] font-medium">{error}</span>
      </div>
    );
  }

  // Get columns from first data item
  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'geometry' && k !== 'location' && k !== 'metadata') : [];

  return (
    <div className="flex flex-col h-full">
      {/* Table Toolbar */}
      <div className="h-9 border-b border-border bg-card flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
            <span>{layerName}</span>
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{data.length} records</span>
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <Filter size={12} />
            Filter
          </button>
          <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <Download size={12} />
            Export
          </button>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search attributes..." 
            className="text-[10px] bg-muted/50 border border-border rounded px-2 pl-7 py-1 w-48 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-auto bg-background">
        <table className="w-full text-[10px] border-collapse min-w-max">
          <thead className="bg-muted sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="border-r border-b border-border p-1.5 text-left bg-muted w-10">#</th>
              {columns.map(col => (
                <th key={col} className="border-r border-b border-border p-1.5 text-left font-bold text-muted-foreground uppercase tracking-tighter">
                  {col.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-primary/5 transition-colors border-b border-border/50 group">
                <td className="border-r border-border/50 p-1.5 text-muted-foreground text-center bg-muted/30 group-hover:bg-primary/10">{i + 1}</td>
                {columns.map(col => (
                  <td key={col} className="border-r border-border/50 p-1.5 text-foreground truncate max-w-[200px]">
                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="h-6 border-t border-border bg-muted/50 flex items-center px-3 text-[9px] text-muted-foreground shrink-0">
        <span>Selected: 0</span>
        <span className="mx-3">|</span>
        <span>Filter: All</span>
      </div>
    </div>
  );
};
