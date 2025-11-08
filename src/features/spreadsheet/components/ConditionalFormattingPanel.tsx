import React, { useState } from 'react';
import { useSpreadsheetStore } from '../store/spreadsheetStore';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import Button from '../../../components/ui/button';
import Input from '../../../components/ui/input';
import Select from '../../../components/ui/select';

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
                <button onClick={toggleConditionalFormattingPanel} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>

            <div className="flex-grow overflow-y-auto">
                <h3 className="text-sm font-medium mb-2">Current Rules</h3>
                {activeSheet.conditionalFormats.length === 0 ? (
                    <p className="text-xs text-gray-500">No rules applied to this sheet.</p>
                ) : (
                    <ul className="space-y-2">
                        {activeSheet.conditionalFormats.map(rule => (
                            <li key={rule.id} className="text-xs p-2 bg-white rounded border flex justify-between items-center">
                                <span>{`If value ${rule.type.replace(/([A-Z])/g, ' $1').toLowerCase()} "${rule.value}"`}</span>
                                <button onClick={() => removeConditionalFormat(rule.id)} className="text-red-500 hover:text-red-700 font-bold">x</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300">
                <h3 className="text-sm font-medium mb-2">New Rule for Selection</h3>
                <div className="space-y-2">
                    <Select value={ruleType} onChange={e => setRuleType(e.target.value as any)}>
                        <option value="greaterThan">Greater Than</option>
                        <option value="lessThan">Less Than</option>
                        <option value="equalTo">Equal To</option>
                        <option value="textContains">Text Contains</option>
                    </Select>
                    <Input
                        type={ruleType === 'textContains' ? 'text' : 'number'}
                        placeholder="Value"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                    />
                    <div className="flex items-center">
                        <label htmlFor="fillColor" className="text-sm mr-2">Color:</label>
                        <Input
                            id="fillColor"
                            type="color"
                            value={fillColor}
                            onChange={e => setFillColor(e.target.value)}
                            className="w-10 h-8 p-1"
                        />
                    </div>
                </div>
                <Button onClick={handleAddRule} className="w-full mt-4">
                    Add Rule
                </Button>
            </div>
        </div>
    );
};

export default ConditionalFormattingPanel;