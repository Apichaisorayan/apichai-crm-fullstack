import React, { createContext, useContext, useState, useCallback } from "react";

// ──────────────────────────────────────────────────────────────
// Context for tracking which cell is "actively editing"
// Used to enable keyboard navigation (arrow keys / Tab) between cells
// ──────────────────────────────────────────────────────────────

export type ActiveCell = { rowIndex: number; colId: string } | null;

interface CellNavContextValue {
    activeCell: ActiveCell;
    setActiveCell: (cell: ActiveCell) => void;
    navigableColIds: string[];
    totalRows: number;
    navigate: (from: ActiveCell, dir: 'up' | 'down' | 'left' | 'right') => void;
}

const CellNavContext = createContext<CellNavContextValue>({
    activeCell: null,
    setActiveCell: () => { },
    navigableColIds: [],
    totalRows: 0,
    navigate: () => { },
});

interface CellNavProviderProps {
    children: React.ReactNode;
    navigableColIds: string[];
    totalRows: number;
}

export const CellNavProvider: React.FC<CellNavProviderProps> = ({
    children,
    navigableColIds,
    totalRows,
}) => {
    const [activeCell, setActiveCell] = useState<ActiveCell>(null);

    const navigate = useCallback(
        (from: ActiveCell, dir: 'up' | 'down' | 'left' | 'right') => {
            if (!from) return;
            const { rowIndex, colId } = from;
            const colIdx = navigableColIds.indexOf(colId);
            if (colIdx === -1) return;

            let newRow = rowIndex;
            let newColIdx = colIdx;

            if (dir === 'up') newRow = Math.max(0, rowIndex - 1);
            if (dir === 'down') newRow = Math.min(totalRows - 1, rowIndex + 1);
            if (dir === 'left') newColIdx = Math.max(0, colIdx - 1);
            if (dir === 'right') newColIdx = Math.min(navigableColIds.length - 1, colIdx + 1);

            setActiveCell({ rowIndex: newRow, colId: navigableColIds[newColIdx] });
        },
        [navigableColIds, totalRows]
    );

    return (
        <CellNavContext.Provider value={{ activeCell, setActiveCell, navigableColIds, totalRows, navigate }}>
            {children}
        </CellNavContext.Provider>
    );
};

export const useCellNav = () => useContext(CellNavContext);
