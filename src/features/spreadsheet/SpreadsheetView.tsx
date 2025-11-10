
import React from 'react';
import Toolbar from '../../components/spreadsheet/Toolbar';
import FormulaBar from '../../components/spreadsheet/FormulaBar';
import Grid from '../../components/spreadsheet/Grid';
import SheetTabs from '../../components/spreadsheet/SheetTabs';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSpreadsheetStore } from '../../lib/store/spreadsheetStore';
import { useAutoSave } from '../../lib/storage/autoSave';
import { indexedDB } from '../../lib/storage/indexedDB';
import ConditionalFormattingPanel from '../../components/spreadsheet/ConditionalFormattingPanel';
import DataValidationDialog from '../../components/spreadsheet/DataValidationDialog';
import SortDialog from '../../components/spreadsheet/SortDialog';

const SpreadsheetView: React.FC = () => {
  const { 
    workbook, 
    createWorkbook, 
    loadWorkbook, 
    isConditionalFormattingPanelOpen, 
    isDataValidationDialogOpen,
    isSortDialogOpen,
  } = useSpreadsheetStore(state => ({
    workbook: state.workbook,
    createWorkbook: state.createWorkbook,
    loadWorkbook: state.loadWorkbook,
    isConditionalFormattingPanelOpen: state.isConditionalFormattingPanelOpen,
    isDataValidationDialogOpen: state.isDataValidationDialogOpen,
    isSortDialogOpen: state.isSortDialogOpen,
  }));
  
  useKeyboard();
  useAutoSave();

  React.useEffect(() => {
    if (!workbook) {
      const init = async () => {
        const recentWorkbooks = await indexedDB.getAll();
        if (recentWorkbooks.length > 0 && recentWorkbooks[0].data) {
          loadWorkbook(recentWorkbooks[0].data);
        } else {
          createWorkbook('My First Workbook');
        }
      };
      init();
    }
  }, [workbook, createWorkbook, loadWorkbook]);

  if (!workbook) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Loading Workbook...</p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full max-w-screen-2xl flex flex-col font-sans text-sm outline-none bg-gray-200 text-gray-900 shadow-2xl rounded-lg overflow-hidden"
    >
      <Toolbar />
      <FormulaBar />
      <div className="flex-grow flex overflow-hidden relative">
        <Grid />
        {isConditionalFormattingPanelOpen && <ConditionalFormattingPanel />}
      </div>
      <SheetTabs />
      {isDataValidationDialogOpen && <DataValidationDialog />}
      {isSortDialogOpen && <SortDialog />}
    </div>
  );
};

export default SpreadsheetView;