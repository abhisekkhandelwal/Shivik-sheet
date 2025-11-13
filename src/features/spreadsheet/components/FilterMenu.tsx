
import React, { useState, useMemo, useEffect } from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import Button from './ui/button';
import Input from './ui/input';
import { getDisplayValue, addressToId } from '../utils/cellUtils';

interface FilterMenuProps {
  col: number;
  onClose: () => void;
}

const FilterMenu: React.FC<FilterMenuProps> = ({ col, onClose }) => {
    const { activeSheet, sortSheet, applyFilter, clearColumnFilter } = useSpreadsheet();
    const [searchTerm, setSearchTerm] = useState('');
    const [checkedValues, setCheckedValues] = useState<Set<string>>(new Set());
    
    const { uniqueValues, hasFilter } = useMemo(() => {
        if (!activeSheet || !activeSheet.filter) return { uniqueValues: [], hasFilter: false };

        const values = new Set<string>();
        const startRow = activeSheet.filter.range.start.row + 1; // Skip header
        for (let r = startRow; r <= activeSheet.filter.range.end.row; r++) {
            const cellId = addressToId({ col, row: r });
            const displayValue = getDisplayValue(activeSheet.data[cellId]);
            values.add(displayValue);
        }

        const existingFilter = activeSheet.filter.criteria?.[col]?.values;
        return { 
            uniqueValues: Array.from(values).sort(),
            hasFilter: !!existingFilter
        };
    }, [activeSheet, col]);
    
    useEffect(() => {
        // Initialize checked state from store or check all by default
        const existingFilter = activeSheet?.filter?.criteria?.[col]?.values;
        if (existingFilter) {
            setCheckedValues(new Set(existingFilter));
        } else {
            setCheckedValues(new Set(uniqueValues));
        }
    }, [uniqueValues, col, activeSheet]);


    const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setCheckedValues(new Set(uniqueValues));
        } else {
            setCheckedValues(new Set());
        }
    };
    
    const handleToggleValue = (value: string) => {
        const newChecked = new Set(checkedValues);
        if (newChecked.has(value)) {
            newChecked.delete(value);
        } else {
            newChecked.add(value);
        }
        setCheckedValues(newChecked);
    };

    const filteredList = useMemo(() => {
        return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [uniqueValues, searchTerm]);

    const handleOk = () => {
        applyFilter(col, checkedValues);
        onClose();
    };

    const isAllChecked = uniqueValues.length > 0 && checkedValues.size === uniqueValues.length;

    return (
        <div className="bg-gray-50 border border-gray-300 rounded-md shadow-lg w-64 text-sm flex flex-col" onMouseDown={e => e.stopPropagation()}>
            <div className="p-2 space-y-1 border-b">
                <button className="w-full text-left px-2 py-1 hover:bg-gray-200 rounded" onClick={() => { sortSheet(col, 'asc', true); onClose(); }}>Sort A to Z</button>
                <button className="w-full text-left px-2 py-1 hover:bg-gray-200 rounded" onClick={() => { sortSheet(col, 'desc', true); onClose(); }}>Sort Z to A</button>
            </div>
            {hasFilter && (
                 <div className="p-2 border-b">
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-200 rounded" onClick={() => { clearColumnFilter(col); onClose(); }}>Clear Filter</button>
                </div>
            )}
            <div className="p-2 border-b">
                <Input 
                    type="text" 
                    placeholder="Search" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full"
                />
            </div>
            <div className="flex-grow p-2 overflow-y-auto max-h-48">
                <label className="flex items-center px-2 py-1">
                    <input type="checkbox" checked={isAllChecked} onChange={handleToggleAll} />
                    <span className="ml-2">(Select All)</span>
                </label>
                {filteredList.map(val => (
                     <label key={val} className="flex items-center px-2 py-1">
                        <input 
                            type="checkbox"
                            checked={checkedValues.has(val)}
                            onChange={() => handleToggleValue(val)}
                        />
                        <span className="ml-2">{val || '(Blanks)'}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end p-2 bg-gray-100 border-t space-x-2">
                <Button onClick={handleOk}>OK</Button>
                <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</Button>
            </div>
        </div>
    );
};

export default FilterMenu;
