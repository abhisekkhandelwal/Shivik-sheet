
import React, { useState } from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import Button from '../ui/button';
import Select from '../ui/select';
import { colIndexToLabel } from '../../lib/utils/cellUtils';
import { sortRange } from '../../lib/utils/rangeUtils';

const SortDialog: React.FC = () => {
    const { activeSheet, toggleSortDialog, sortSheet } = useSpreadsheet();
    
    if (!activeSheet?.selection) return null;
    
    const sortedSelection = sortRange(activeSheet.selection);
    const [sortCol, setSortCol] = useState(sortedSelection.start.col);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [hasHeader, setHasHeader] = useState(true);

    const handleSort = () => {
        sortSheet(sortCol, sortOrder, hasHeader);
        toggleSortDialog();
    };
    
    const columns = Array.from(
        { length: sortedSelection.end.col - sortedSelection.start.col + 1 },
        (_, i) => sortedSelection.start.col + i
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                <h2 className="text-lg font-semibold mb-4">Sort Range</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sort by</label>
                        <Select value={sortCol} onChange={e => setSortCol(parseInt(e.target.value, 10))}>
                            {columns.map(c => (
                                <option key={c} value={c}>
                                    Column {colIndexToLabel(c)}
                                </option>
                            ))}
                        </Select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Order</label>
                        <Select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}>
                           <option value="asc">A to Z</option>
                           <option value="desc">Z to A</option>
                        </Select>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="hasHeader"
                            type="checkbox"
                            checked={hasHeader}
                            onChange={e => setHasHeader(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="hasHeader" className="ml-2 block text-sm text-gray-900">
                            My data has headers
                        </label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <Button onClick={toggleSortDialog} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                        Cancel
                    </Button>
                    <Button onClick={handleSort}>
                        Sort
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SortDialog;