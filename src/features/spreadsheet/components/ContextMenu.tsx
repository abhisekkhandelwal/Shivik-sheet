
import React from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import { findMergeForCell, sortRange, doesRangeOverlapMerges } from '../utils/rangeUtils';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
    const { 
        cutSelection, 
        copySelection, 
        paste, 
        clearSelection,
        activeSheet,
        mergeSelection,
        unmergeSelection 
    } = useSpreadsheet();

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    const isSelectionMerged = activeSheet ? !!findMergeForCell(activeSheet.activeCell, activeSheet.merges) : false;
    const sorted = activeSheet ? sortRange(activeSheet.selection) : null;
    const canMerge = sorted ? (sorted.start.col !== sorted.end.col || sorted.start.row !== sorted.end.row) && !doesRangeOverlapMerges(activeSheet!.selection, activeSheet!.merges) : false;

    const menuItems = [
        { type: 'item' as const, label: 'Cut', action: () => handleAction(cutSelection) },
        { type: 'item' as const, label: 'Copy', action: () => handleAction(copySelection) },
        { type: 'item' as const, label: 'Paste', action: () => handleAction(paste) },
        { type: 'divider' as const },
        ...(isSelectionMerged
            ? [{ type: 'item' as const, label: 'Unmerge cells', action: () => handleAction(unmergeSelection) }]
            : (canMerge ? [{ type: 'item' as const, label: 'Merge cells', action: () => handleAction(mergeSelection) }] : [])
        ),
        { type: 'divider' as const },
        { type: 'item' as const, label: 'Clear Contents', action: () => handleAction(clearSelection) },
    ];

    return (
        <div
            className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 text-sm"
            style={{ top: y, left: x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <ul>
                {menuItems.map((item, index) =>
                    item.type === 'divider' ? (
                        <li key={index} className="border-t border-gray-200 my-1"></li>
                    ) : (
                        'label' in item && <li
                            key={index}
                            onClick={item.action}
                            className="px-4 py-1 hover:bg-blue-500 hover:text-white cursor-pointer"
                        >
                            {item.label}
                        </li>
                    )
                )}
            </ul>
        </div>
    );
};

export default ContextMenu;
