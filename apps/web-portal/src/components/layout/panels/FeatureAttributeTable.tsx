import React from 'react';
import { cn } from "@workspace/ui/lib/utils";

export const FeatureAttributeTable: React.FC = () => (
  <table className="w-full text-[10px] border-collapse bg-card">
    <thead className="bg-muted sticky top-0">
      <tr>
        <th className="border border-border p-1 text-left w-10">FID</th>
        <th className="border border-border p-1 text-left">PARCEL_ID</th>
        <th className="border border-border p-1 text-left">OWNER</th>
        <th className="border border-border p-1 text-left">AREA_SQM</th>
        <th className="border border-border p-1 text-left">STATUS</th>
      </tr>
    </thead>
    <tbody>
      {[...Array(10)].map((_, i) => (
        <tr key={i} className="hover:bg-primary/5 odd:bg-card even:bg-muted/30 transition-colors">
          <td className="border border-border/50 p-1">{i}</td>
          <td className="border border-border/50 p-1 text-foreground">P-{1000 + i}</td>
          <td className="border border-border/50 p-1 text-foreground">Estate Holder {i + 1}</td>
          <td className="border border-border/50 p-1 text-foreground">{(Math.random() * 5000).toFixed(2)}</td>
          <td className="border border-border/50 p-1">
            <span className={cn(
              "px-1 rounded text-[9px] font-bold uppercase",
              i % 3 === 0 ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600"
            )}>
              {i % 3 === 0 ? 'Active' : 'Pending'}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
