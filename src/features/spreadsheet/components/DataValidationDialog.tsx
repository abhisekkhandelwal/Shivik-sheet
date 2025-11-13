

import React, { useState } from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import Button from './ui/button';
import Input from './ui/input';

// FIX: Changed to a named export to resolve module resolution issue.
export const DataValidationDialog: React.FC = () => {
    const { activeSheet, setDataValidation, toggleDataValidationDialog } = useSpreadsheet();
    const [criteria, setCriteria] = useState('');

    if (!activeSheet?.selection) return null;

    const handleSave = () => {
        const criteriaList = criteria.split(',').map(item => item.trim()).filter(Boolean);
        if (criteriaList.length > 0) {
            setDataValidation({
                range: activeSheet.selection,
                type: 'list',
                criteria: criteriaList,
                errorMessage: `Value must be one of: ${criteriaList.join(', ')}`,
            });
        }
        toggleDataValidationDialog();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                <h2 className="text-lg font-semibold mb-4">Data Validation</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Criteria</label>
                        <p className="text-xs text-gray-500 mb-1">Enter a list of comma-separated values.</p>
                        <Input
                            placeholder="e.g. Pending, In Progress, Completed"
                            value={criteria}
                            onChange={e => setCriteria(e.target.value)}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <Button onClick={toggleDataValidationDialog} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
};
