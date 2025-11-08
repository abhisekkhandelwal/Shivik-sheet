import React, { useState, useMemo, useCallback } from 'react';

// --- TYPE DEFINITIONS ---
type Shortcut = {
  keys: string;
  action: string;
  description: string;
};

type ShortcutCategory = {
  id: 'spreadsheet' | 'system' | 'web' | 'text';
  name: string;
  shortcuts: Shortcut[];
};

// --- COMPONENT PROPS ---
interface ShortcutsHubProps {
  onClose?: () => void;
}

// --- HARDCODED SHORTCUT DATA ---
const shortcutsData: ShortcutCategory[] = [
  {
    id: 'spreadsheet',
    name: 'Spreadsheet Shortcuts (Excel-style)',
    shortcuts: [
      { keys: 'Alt + =', action: 'AutoSum', description: 'Inserts SUM function for adjacent numbers' },
      { keys: 'Ctrl + Shift + L', action: 'Toggle Filter', description: 'Apply/remove filters (modern Excel)' },
      { keys: 'Alt + D, F, F', action: 'Toggle Filter (Legacy)', description: 'Legacy Excel filter toggle' },
      { keys: 'Alt + ↓', action: 'Open Filter Menu', description: 'Opens dropdown in filtered column' },
      { keys: 'Ctrl + ;', action: 'Insert Current Date', description: 'Adds today’s date' },
      { keys: 'Ctrl + Shift + ;', action: 'Insert Current Time', description: 'Adds current time' },
      { keys: 'F2', action: 'Edit Cell', description: 'Edit cell without double-click' },
    ],
  },
  {
    id: 'system',
    name: 'System-Wide (Windows)',
    shortcuts: [
      { keys: 'Ctrl + C', action: 'Copy', description: 'Copy selected item' },
      { keys: 'Ctrl + V', action: 'Paste', description: 'Paste from clipboard' },
      { keys: 'Ctrl + X', action: 'Cut', description: 'Cut selected item' },
      { keys: 'Ctrl + Z', action: 'Undo', description: 'Revert last action' },
      { keys: 'Ctrl + Y', action: 'Redo', description: 'Re-apply undone action' },
      { keys: 'Ctrl + S', action: 'Save', description: 'Save current file' },
      { keys: 'Alt + Tab', action: 'Switch Windows', description: 'Cycle open apps' },
      { keys: 'Win + D', action: 'Show Desktop', description: 'Minimize/restore all windows' },
      { keys: 'Win + E', action: 'Open File Explorer', description: 'Launch file browser' },
      { keys: 'Win + L', action: 'Lock Computer', description: 'Lock screen instantly' },
      { keys: 'Ctrl + Shift + Esc', action: 'Open Task Manager', description: 'Force-quit unresponsive apps' },
    ],
  },
  {
    id: 'web',
    name: 'Web Browsing',
    shortcuts: [
      { keys: 'Ctrl + T', action: 'New Tab', description: 'Open new browser tab' },
      { keys: 'Ctrl + W', action: 'Close Tab', description: 'Close current tab' },
      { keys: 'Ctrl + Shift + T', action: 'Reopen Closed Tab', description: 'Restore last closed tab' },
      { keys: 'Ctrl + F', action: 'Find', description: 'Search text on page' },
      { keys: 'F5', action: 'Refresh Page', description: 'Reload current page' },
      { keys: 'Ctrl + R', action: 'Refresh Page', description: 'Reload current page' },
      { keys: 'Ctrl + Tab', action: 'Next Tab', description: 'Switch to next tab' },
      { keys: 'Ctrl + Shift + Tab', action: 'Previous Tab', description: 'Switch to previous tab' },
    ],
  },
  {
    id: 'text',
    name: 'Text Editing',
    shortcuts: [
      { keys: 'Ctrl + A', action: 'Select All', description: 'Select all content' },
      { keys: 'Ctrl + B', action: 'Bold', description: 'Toggle bold formatting' },
      { keys: 'Ctrl + I', action: 'Italic', description: 'Toggle italic formatting' },
      { keys: 'Ctrl + U', action: 'Underline', description: 'Toggle underline' },
      { keys: 'Ctrl + ←', action: 'Navigate Words', description: 'Jump word-by-word' },
      { keys: 'Ctrl + →', action: 'Navigate Words', description: 'Jump word-by-word' },
    ],
  },
];

// --- HELPER COMPONENTS ---
const Keycap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
    {children}
  </kbd>
);

const ShortcutKey: React.FC<{ shortcut: string }> = ({ shortcut }) => {
  const keys = shortcut.split(/(\s[+,]\s)/).filter(Boolean);
  
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => {
        const trimmedKey = key.trim();
        if (trimmedKey === '+' || trimmedKey === ',') {
          return <span key={index} className="text-gray-400 dark:text-gray-500">{trimmedKey}</span>;
        }
        let displayKey = trimmedKey;
        if(trimmedKey === 'Win') displayKey = '⊞';
        return <Keycap key={index}>{displayKey}</Keycap>;
      })}
    </div>
  );
};


// --- MAIN COMPONENT ---
const ShortcutsHub: React.FC<ShortcutsHubProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(shortcutsData.map(c => c.id))
  );
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCopy = useCallback((keys: string) => {
    navigator.clipboard.writeText(keys).then(() => {
      setCopiedShortcut(keys);
      setTimeout(() => setCopiedShortcut(null), 2000);
    });
  }, []);
  
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return shortcutsData;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    
    return shortcutsData
      .map(category => {
        const filteredShortcuts = category.shortcuts.filter(
          shortcut =>
            shortcut.action.toLowerCase().includes(lowercasedTerm) ||
            shortcut.description.toLowerCase().includes(lowercasedTerm)
        );
        return { ...category, shortcuts: filteredShortcuts };
      })
      .filter(category => category.shortcuts.length > 0);
  }, [searchTerm]);

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h1>
            {onClose && (
                <button 
                    onClick={onClose} 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Close shortcuts panel"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            )}
        </div>
      
      <input
        type="text"
        placeholder="Search shortcuts..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 text-sm bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
      />

      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {filteredData.map(category => (
          <section key={category.id} className="mb-4">
            <h2 
              className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 cursor-pointer flex items-center justify-between"
              onClick={() => toggleCategory(category.id)}
            >
              <span>{category.name}</span>
              <svg 
                  className={`w-5 h-5 transition-transform ${expandedCategories.has(category.id) ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </h2>
            {expandedCategories.has(category.id) && (
              <ul className="space-y-2">
                {category.shortcuts.map(shortcut => (
                  <li key={shortcut.keys + shortcut.action} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{shortcut.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{shortcut.description}</p>
                    </div>
                    <div className="relative">
                        <button
                          onClick={() => handleCopy(shortcut.keys)}
                          aria-label={`Copy shortcut ${shortcut.keys}`}
                          className="ml-4 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            <ShortcutKey shortcut={shortcut.keys} />
                        </button>
                        {copiedShortcut === shortcut.keys && (
                            <div className="absolute -top-7 right-0 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-black rounded-md shadow-lg">
                                Copied!
                            </div>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
         {filteredData.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No shortcuts found for "{searchTerm}"</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ShortcutsHub);
