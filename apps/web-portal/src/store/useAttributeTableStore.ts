import { create } from 'zustand';

interface AttributeTable {
  id: string;
  name: string;
}

interface AttributeTableState {
  openTables: AttributeTable[];
  activeTableId: string | null;
  addTable: (id: string, name: string) => void;
  removeTable: (id: string) => void;
  setActiveTable: (id: string | null) => void;
}

export const useAttributeTableStore = create<AttributeTableState>((set) => ({
  openTables: [],
  activeTableId: null,
  
  addTable: (id, name) => set((state) => {
    // Check if table is already open
    const exists = state.openTables.find(t => t.id === id);
    if (exists) {
      return { activeTableId: id };
    }
    
    return {
      openTables: [...state.openTables, { id, name }],
      activeTableId: id
    };
  }),
  
  removeTable: (id) => set((state) => {
    const newTables = state.openTables.filter(t => t.id !== id);
    let newActiveId = state.activeTableId;
    
    if (state.activeTableId === id) {
      newActiveId = newTables.length > 0 ? newTables[newTables.length - 1].id : null;
    }
    
    return {
      openTables: newTables,
      activeTableId: newActiveId
    };
  }),
  
  setActiveTable: (id) => set({ activeTableId: id }),
}));
