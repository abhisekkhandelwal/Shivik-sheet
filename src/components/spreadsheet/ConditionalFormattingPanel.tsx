
import React, { useState } from 'react';
import { useSpreadsheetStore } from '../../lib/store/spreadsheetStore';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import Button from '../ui/button';
import Input from '../ui/input';
import Select from '../ui/select';

const ConditionalFormattingPanel: React.FC = () => {
    const { activeSheet, addConditionalFormat, removeConditionalFormat, toggleConditionalFormattingPanel } = useSpreadsheet();
    const [ruleType, setRuleType] = useState<'greaterThan' | 'lessThan' | 'equalTo' | 'textContains'>('greaterThan');
    const [value, setValue] = useState('');
    const [fillColor, setFillColor] = useState('#ffc7ce');

    if (!activeSheet) return null;

    const handleAddRule = () => {
        if (!value.trim() || !activeSheet.selection) return;

        addConditionalFormat({
            range: activeSheet.selection,
            type: ruleType,
            value: ruleType === 'textContains' ? value : Number(value),
            style: { fillColor },
        });
        setValue('');
    };

    return (
        <div className="absolute top-0 right-0 h-full w-64 bg-gray-100 border-l border-gray-300 shadow-lg z-40 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Conditional Formatting</h2>
                <button onClick={toggleConditionalFormattingPanel}>&times;</button>
            </div>
            {/* ... Rest of the component implementation ... */}
        </div>
    );
};

export default ConditionalFormattingPanel;