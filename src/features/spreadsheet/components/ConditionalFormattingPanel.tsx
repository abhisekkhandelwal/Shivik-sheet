
import React, { useState } from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import Button from './ui/button';
import Input from './ui/input';
import Select from './ui/select';

const ConditionalFormattingPanel: React.FC = () => {
    const { activeSheet, addConditionalFormat, toggleConditionalFormattingPanel } = useSpreadsheet();
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
                <button onClick={toggleConditionalFormattingPanel} className="text-xl font-bold">&times;</button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Format cells that are</label>
                    <Select value={ruleType} onChange={e => setRuleType(e.target.value as any)}>
                        <option value="greaterThan">Greater Than</option>
                        <option value="lessThan">Less Than</option>
                        <option value="equalTo">Equal To</option>
                        <option value="textContains">Text Contains</option>
                    </Select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700">Value</label>
                    <Input 
                        type={ruleType === 'textContains' ? 'text' : 'number'}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700">With</label>
                    <Input 
                        type="color"
                        value={fillColor}
                        onChange={e => setFillColor(e.target.value)}
                        className="w-full h-8"
                    />
                </div>
                <Button onClick={handleAddRule}>Add Rule</Button>
            </div>
             <div className="mt-4 border-t pt-4">
                <h3 className="font-semibold mb-2">Current Rules</h3>
                {/* NOTE: UI for listing/editing/deleting rules is not yet implemented */}
                <p className="text-xs text-gray-500">Managing existing rules is a pending feature.</p>
            </div>
        </div>
    );
};

export default ConditionalFormattingPanel;
