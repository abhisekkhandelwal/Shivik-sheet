
import React from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import { addressToId } from '../utils/cellUtils';
import { findMergeForCell, sortRange, doesRangeOverlapMerges } from '../utils/rangeUtils';
import { FONT_SIZES, useSpreadsheetStore } from '../store/spreadsheetStore';
import RibbonDropdown, { DropdownItem } from '../../../components/ui/RibbonDropdown';

const FONT_FAMILIES = ['Aptos Narrow', 'Arial', 'Calibri', 'Courier New', 'Times New Roman', 'Verdana'];
const NUMBER_FORMATS = [
    { value: 'general', label: 'General' }, { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' }, { value: 'accounting', label: 'Accounting' },
    { value: 'comma', label: 'Comma' },
    { value: 'short_date', label: 'Short Date' }, { value: 'long_date', label: 'Long Date' },
    { value: 'time', label: 'Time' }, { value: 'percentage', label: 'Percentage' },
    { value: 'fraction', label: 'Fraction' }, { value: 'scientific', label: 'Scientific' },
    { value: 'text', label: 'Text' },
];

const RibbonButton = React.forwardRef<HTMLButtonElement, { 
    onClick?: () => void; title: string; isActive?: boolean; disabled?: boolean;
    children: React.ReactNode; className?: string;
}>(({ onClick, title, isActive = false, disabled = false, children, className }, ref) => (
    <button ref={ref} title={title} onClick={onClick} disabled={disabled}
        className={`p-1 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-300 text-gray-800 ${isActive ? 'bg-blue-200' : ''} disabled:text-gray-400 disabled:cursor-not-allowed ${className}`}>
        {children}
    </button>
));

const RibbonSelect: React.FC<{
    title: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode; className?: string;
}> = ({ title, value, onChange, children, className }) => (
    <select title={title} value={value} onChange={onChange}
        className={`h-7 text-sm px-1 border border-gray-400 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 ${className}`}>
        {children}
    </select>
);

const ColorPicker: React.FC<{ styleKey: 'textColor' | 'fillColor'; title: string; children: React.ReactNode; }> = ({ styleKey, title, children }) => {
    const { activeSheet, setCellStyle } = useSpreadsheet();
    if (!activeSheet?.selection) return null;
    const activeCellId = addressToId(activeSheet.activeCell);
    const activeCellStyle = activeSheet.data[activeCellId]?.style;
    const defaultValue = styleKey === 'textColor' ? '#000000' : '#ffffff';
    const color = activeCellStyle?.[styleKey] ?? defaultValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setCellStyle(activeSheet.selection, { [styleKey]: e.target.value });

    return (
        <div title={title} className="relative p-1 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-300 cursor-pointer text-gray-800">
            <input type="color" value={color} onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
            {children}
        </div>
    );
};

const RibbonLargeDropdownButton: React.FC<{
    title: string; disabled?: boolean; children: React.ReactNode; label: string; items?: DropdownItem[]; onClick?: () => void;
}> = ({ title, disabled = false, children, label, items, onClick }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleItemClick = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    const handleMainClick = () => {
        if (onClick) {
            onClick();
        } else if (items) {
            setIsOpen(!isOpen);
        }
    }

    return (
        <div ref={wrapperRef} className="relative h-full flex items-center">
            <button
                title={title}
                disabled={disabled}
                onClick={handleMainClick}
                className="flex flex-col items-center justify-center p-1 h-full w-[70px] text-center rounded hover:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
                <div className="w-8 h-8 flex items-center justify-center">{children}</div>
                <div className="flex items-center text-xs whitespace-normal leading-tight mt-1">
                    <span>{label}</span>
                    {items && <svg className="w-3 h-3 ml-px self-center" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                </div>
            </button>
            {isOpen && items && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-max">
                <ul>
                    {items.map((item, index) => (
                    <li key={index}>
                        <button onClick={() => handleItemClick(item.action)} disabled={item.disabled} className="w-full text-left px-4 py-1 text-sm hover:bg-blue-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400">
                         {item.label}
                        </button>
                    </li>
                    ))}
                </ul>
                </div>
            )}
        </div>
    );
};

const RibbonSection: React.FC<{ label: string; children: React.ReactNode; className?: string; }> = ({ label, children, className }) => (
    <div className="flex flex-col items-center px-1">
        <div className={`flex-grow flex items-center ${className}`}>
            {children}
        </div>
        <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
);

const Toolbar: React.FC = () => {
    const {
        activeSheet, toggleCellStyle, setCellStyle, setSelectionTextAlign, setSelectionVAlign,
        toggleWrapText, setNumberFormat, mergeSelection, unmergeSelection, copySelection,
        cutSelection, increaseFontSize, decreaseFontSize, clearSelection,
        addOutlineBorderToSelection, increaseDecimalPlaces, decreaseDecimalPlaces,
        autoSum, fillSelection, clearAll, clearFormats, averageSelection, countSelection,
        maxSelection, minSelection, insertRows, deleteRows, insertColumns, deleteColumns,
        toggleConditionalFormattingPanel, toggleDataValidationDialog
    } = useSpreadsheet();
    const [activeTab, setActiveTab] = React.useState('Home');

    if (!activeSheet?.selection) {
        return <div className="flex items-center px-2 py-1 bg-gray-200 border-b border-gray-300 shadow-sm h-[112px]"></div>;
    }

    const activeCellId = addressToId(activeSheet.activeCell);
    const activeCellStyle = activeSheet.data[activeCellId]?.style ?? {};
    
    const selectionIsMerged = !!findMergeForCell(activeSheet.activeCell, activeSheet.merges);
    const sortedSelection = sortRange(activeSheet.selection);
    const selectionIsMultipleCells = sortedSelection.start.col !== sortedSelection.end.col || sortedSelection.start.row !== sortedSelection.end.row;
    const canMerge = selectionIsMultipleCells && !doesRangeOverlapMerges(activeSheet.selection, activeSheet.merges);

    const handleMergeToggle = () => {
        if (selectionIsMerged) {
            unmergeSelection();
        } else if (canMerge) {
            mergeSelection();
            setCellStyle(activeSheet.selection, { textAlign: 'center' });
        }
    };

    const autoSumItems = [ { label: 'Sum', action: autoSum }, { label: 'Average', action: averageSelection }, { label: 'Count Numbers', action: countSelection }, { label: 'Max', action: maxSelection }, { label: 'Min', action: minSelection }, ];
    const fillItems = [ { label: 'Fill Down', action: () => fillSelection('down') } ];
    const clearItems = [ { label: 'Clear All', action: clearAll }, { label: 'Clear Formats', action: clearFormats }, { label: 'Clear Contents', action: clearSelection }, ];
    const insertItems = [ { label: 'Insert Sheet Rows', action: insertRows }, { label: 'Insert Sheet Columns', action: insertColumns } ];
    const deleteItems = [ { label: 'Delete Sheet Rows', action: deleteRows }, { label: 'Delete Sheet Columns', action: deleteColumns } ];
    const formatItems = [ { label: 'Row Height...', action: () => {} , disabled: true}, { label: 'AutoFit Row Height', action: () => {}, disabled: true }, { label: 'Column Width...', action: () => {}, disabled: true }, { label: 'AutoFit Column Width', action: () => {}, disabled: true }, ];

    const TabButton = ({ name }: { name: string }) => (
        <button onClick={() => setActiveTab(name)} className={`px-3 py-1 text-sm ${activeTab === name ? 'bg-gray-200 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-200'}`}>
            {name}
        </button>
    );

    return (
        <div className="flex flex-col bg-gray-100 border-b border-gray-300 shadow-sm select-none">
            <div className="flex items-center px-1 border-b border-gray-200">
                <TabButton name="Home" />
                <TabButton name="Data" />
            </div>
            <div className={`flex items-stretch px-1 bg-gray-200 ${activeTab !== 'Home' ? 'hidden' : ''}`}>
                <RibbonSection label="Clipboard" className="items-stretch">
                     <div className="flex flex-col items-center justify-center p-1">
                         <RibbonButton title="Paste" className="w-10 h-10 mb-1" disabled><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></RibbonButton>
                         <span className="text-xs">Paste</span>
                    </div>
                    <div className="flex flex-col justify-center space-y-1">
                        <RibbonButton title="Cut (Ctrl+X)" onClick={cutSelection} className="w-6 h-6"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg></RibbonButton>
                        <RibbonButton title="Copy (Ctrl+C)" onClick={copySelection} className="w-6 h-6"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></RibbonButton>
                        <RibbonButton title="Format Painter" disabled className="w-6 h-6"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 15.88a2.89 2.89 0 0 0 4.1 0l2.58-2.58a2.89 2.89 0 0 0 0-4.1 2.89 2.89 0 0 0-4.1 0l-2.22 2.22"></path><path d="M11 5l-2.22 2.22a2.89 2.89 0 0 0 0 4.1l2.58 2.58a2.89 2.89 0 0 0 4.1 0"></path><path d="M18 12.22V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4.78"></path></svg></RibbonButton>
                    </div>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Font" className="flex-col items-start space-y-1">
                    <div className="flex items-center space-x-1">
                        <RibbonSelect title="Font Family" value={activeCellStyle.fontFamily ?? 'Aptos Narrow'} onChange={(e) => setCellStyle(activeSheet.selection, { fontFamily: e.target.value })} className="w-32">
                            {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
                        </RibbonSelect>
                        <RibbonSelect title="Font Size" value={activeCellStyle.fontSize ?? 11} onChange={(e) => setCellStyle(activeSheet.selection, { fontSize: parseInt(e.target.value, 10) })} className="w-16">
                            {FONT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </RibbonSelect>
                    </div>
                    <div className="flex items-center space-x-px">
                        <RibbonButton title="Increase Font Size" onClick={increaseFontSize}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8m-8-4h12M4 8v8m12-8v8m4-3l3 3-3 3"></path></svg></RibbonButton>
                        <RibbonButton title="Decrease Font Size" onClick={decreaseFontSize}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8m-8-4h12M4 8v8m12-8v8m4-3l-3 3 3 3"></path></svg></RibbonButton>
                        <div className="h-5 w-px bg-gray-300 self-center mx-1"></div>
                        <RibbonButton title="Bold" onClick={() => toggleCellStyle('bold')} isActive={!!activeCellStyle.bold} className="font-bold">B</RibbonButton>
                        <RibbonButton title="Italic" onClick={() => toggleCellStyle('italic')} isActive={!!activeCellStyle.italic} className="italic">I</RibbonButton>
                        <RibbonButton title="Underline" onClick={() => toggleCellStyle('underline')} isActive={!!activeCellStyle.underline} className="underline">U</RibbonButton>
                        <RibbonButton title="Borders" onClick={addOutlineBorderToSelection}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM21 9H3m18 6H3M9 3v18m6-18v18"></path></svg></RibbonButton>
                        <ColorPicker styleKey="fillColor" title="Fill Color"><div className="flex flex-col items-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg><div className="w-4 h-1 border border-gray-500" style={{ backgroundColor: activeCellStyle.fillColor ?? '#ffffff' }}/></div></ColorPicker>
                        <ColorPicker styleKey="textColor" title="Text Color"><div className="flex flex-col items-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V6a2 2 0 0 1 2-2h2M4 17v1a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v1M16 20h2a2 2 0 0 0 2-2v-1M12 4v16M8 4h8"></path></svg><div className="w-4 h-1 border border-gray-500" style={{ backgroundColor: activeCellStyle.textColor ?? '#000000' }}/></div></ColorPicker>
                    </div>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Alignment" className="flex-col items-start space-y-1">
                     <div className="flex items-center space-x-px"><RibbonButton title="Align Top" onClick={() => setSelectionVAlign('top')} isActive={activeCellStyle.vAlign === 'top'}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 11h3v10h2V11h3l-4-4-4 4zM4 3v2h16V3H4z" fill="currentColor"/></svg></RibbonButton><RibbonButton title="Align Middle" onClick={() => setSelectionVAlign('middle')} isActive={activeCellStyle.vAlign === 'middle'}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 11h3v4h2v-4h3l-4-4-4 4zm12-2h-3.18C16.3 7.24 15.26 6 14 6s-2.3.24-2.82 1H8v2h3.18c.52.76 1.56 1 2.82 1s2.3-.24 2.82-1H20V9zM4 15h16v2H4v-2z" fill="currentColor"/></svg></RibbonButton><RibbonButton title="Align Bottom" onClick={() => setSelectionVAlign('bottom')} isActive={activeCellStyle.vAlign === 'bottom'}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z" fill="currentColor"/></svg></RibbonButton><RibbonButton title="Wrap Text" onClick={toggleWrapText} isActive={!!activeCellStyle.wrap}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 13l-1-4-1 4M7 20h10M4 16v-2c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v2M12 4v9"></path></svg></RibbonButton></div>
                    <div className="flex items-center space-x-px"><RibbonButton title="Align Left" onClick={() => setSelectionTextAlign('left')} isActive={!activeCellStyle.textAlign || activeCellStyle.textAlign === 'left'}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 21v-2h18v2zm0-4v-2h12v2zm0-4v-2h18v2zm0-4V7h12v2zm0-4V3h18v2z"/></svg></RibbonButton><RibbonButton title="Align Center" onClick={() => setSelectionTextAlign('center')} isActive={activeCellStyle.textAlign === 'center'}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 21v-2h18v2zm3-4v-2h12v2zm-3-4v-2h18v2zm3-4V7h12v2zM3 5V3h18v2z"/></svg></RibbonButton><RibbonButton title="Align Right" onClick={() => setSelectionTextAlign('right')} isActive={activeCellStyle.textAlign === 'right'}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 21v-2h18v2zm6-4v-2h12v2zM3 13v-2h18v2zm6-4V7h12v2zM3 5V3h18v2z"/></svg></RibbonButton><RibbonButton title="Merge & Center" onClick={handleMergeToggle} isActive={selectionIsMerged} disabled={!selectionIsMerged && !canMerge}><svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 20v-2h16v2zm1-3v-2l2.5-3.5L10 17h1.5l-1.87-2.5h4.74L12.5 17H14l2.5-3.5L19 15v-2zM4 7V5h16v2z" fill="currentColor"/></svg></RibbonButton></div>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Number" className="flex-col items-start space-y-1">
                    <RibbonSelect title="Number Format" value={activeCellStyle.format ?? 'general'} onChange={(e) => setNumberFormat(e.target.value)} className="w-36"> {NUMBER_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</RibbonSelect>
                    <div className="flex items-center space-x-px"><RibbonButton title="Accounting Number Format" onClick={() => setNumberFormat('accounting')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></RibbonButton><RibbonButton title="Percent Style" onClick={() => setNumberFormat('percentage')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg></RibbonButton><RibbonButton title="Comma Style" onClick={() => setNumberFormat('comma')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></RibbonButton><RibbonButton title="Increase Decimal" onClick={increaseDecimalPlaces}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12h6m-3-3v6M4 12h4m3 0h1m-5 4.5V7.5L4 12Z"></path></svg></RibbonButton><RibbonButton title="Decrease Decimal" onClick={decreaseDecimalPlaces}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12h6m-3-3v6M4 12h4m3 0h1m-5 4.5V7.5L4 12Z"></path></svg></RibbonButton></div>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Styles" className="space-x-1">
                    <RibbonLargeDropdownButton title="Conditional Formatting" label="Conditional Formatting" onClick={toggleConditionalFormattingPanel}><svg width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 10V3L6 3v7m12 4v7l-6-7H6v7"/></g></svg></RibbonLargeDropdownButton>
                    <RibbonLargeDropdownButton title="Format as Table" label="Format as Table" items={[]} disabled><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm0 4h16v2H4z"></path></svg></RibbonLargeDropdownButton>
                    <RibbonLargeDropdownButton title="Cell Styles" label="Cell Styles" items={[]} disabled><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 20h16V4H4v16zm2-11h12v2H6v-2zm0 4h12v2H6v-2z" opacity=".3"></path><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM6 9h12v2H6zm0 4h12v2H6z"></path></svg></RibbonLargeDropdownButton>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Cells" className="space-x-1">
                    <RibbonLargeDropdownButton title="Insert" label="Insert" items={insertItems}><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg></RibbonLargeDropdownButton>
                    <RibbonLargeDropdownButton title="Delete" label="Delete" items={deleteItems}><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></RibbonLargeDropdownButton>
                    <RibbonLargeDropdownButton title="Format" label="Format" items={formatItems}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V2M4 12H2M22 12h-2M18 18l-1.5-1.5M6 6l1.5 1.5M18 6l-1.5 1.5M6 18l1.5-1.5"></path></svg></RibbonLargeDropdownButton>
                </RibbonSection>
                <div className="h-full w-px bg-gray-300 self-center my-2 mx-1"></div>
                <RibbonSection label="Editing" className="space-x-1">
                    <RibbonDropdown title="AutoSum" label="AutoSum" onMainClick={autoSum} items={autoSumItems}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7H6l6 6-6 6h12"/></svg></RibbonDropdown>
                    <RibbonDropdown items={fillItems} title="Fill" label="Fill"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17V3M5 10l7 7 7-7"></path></svg></RibbonDropdown>
                    <RibbonDropdown items={clearItems} title="Clear" label="Clear"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 6.5l-5.4 5.4M21.5 17.5l-5.4-5.4M4.5 6.5l5.4 5.4M4.5 17.5l5.4-5.4"></path></svg></RibbonDropdown>
                    <RibbonDropdown title="Sort & Filter" label="Sort & Filter" items={[]} disabled><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M7 12h10M10 18h4"></path></svg></RibbonDropdown>
                    <RibbonDropdown title="Find & Select" label="Find & Select" items={[]} disabled><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></RibbonDropdown>
                </RibbonSection>
            </div>
            <div className={`flex items-stretch px-1 bg-gray-200 ${activeTab !== 'Data' ? 'hidden' : ''}`}>
                 <RibbonSection label="Data Tools" className="space-x-1">
                    <RibbonLargeDropdownButton title="Data Validation" label="Data Validation" onClick={toggleDataValidationDialog}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 12l2 2 4-4"/></svg>
                    </RibbonLargeDropdownButton>
                </RibbonSection>
            </div>
        </div>
    );
};

export default Toolbar;