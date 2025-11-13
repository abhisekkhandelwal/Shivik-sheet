
import React from 'react';
import { useSpreadsheetStore } from '../store/spreadsheetStore';
import { FUNCTION_SIGNATURES } from '../services/formula';

const FormulaSuggestions: React.FC = () => {
    const suggestions = useSpreadsheetStore(state => state.formulaSuggestions);
    const selectedIndex = useSpreadsheetStore(state => state.selectedSuggestionIndex);
    const applySuggestion = useSpreadsheetStore(state => state.applySuggestion);

    if (suggestions.length === 0) {
        return null;
    }
    
    const selectedSuggestion = suggestions[selectedIndex];
    const signature = FUNCTION_SIGNATURES[selectedSuggestion] || `${selectedSuggestion}()`;

    const handleMouseDown = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        // we need to set the index before applying
        useSpreadsheetStore.setState({ selectedSuggestionIndex: index });
        applySuggestion();
    }

    return (
        <div className="absolute bg-white border border-gray-300 rounded shadow-lg z-50 text-sm flex">
            <ul className="py-1 max-h-60 overflow-y-auto w-48">
                {suggestions.map((s, i) => (
                    <li
                        key={s}
                        className={`px-3 py-1 cursor-pointer ${i === selectedIndex ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                        onMouseDown={(e) => handleMouseDown(e, i)}
                    >
                        {s}
                    </li>
                ))}
            </ul>
            <div className="p-2 border-l border-gray-200 w-64 text-xs bg-gray-50">
                <p className="font-bold font-mono">{signature}</p>
                {/* Could add function description here later */}
            </div>
        </div>
    );
};

export default FormulaSuggestions;
