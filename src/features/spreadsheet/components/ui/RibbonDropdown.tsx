
import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

interface RibbonDropdownProps {
  children: React.ReactNode;
  items: DropdownItem[];
  title: string;
  label: string;
  disabled?: boolean;
  onMainClick?: () => void;
}

const RibbonDropdown: React.FC<RibbonDropdownProps> = ({ children, items, title, label, disabled, onMainClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (onMainClick) {
        onMainClick();
    } else {
        setIsOpen(!isOpen);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col items-center justify-center p-1 rounded hover:bg-gray-300">
      <button
        title={title}
        disabled={disabled}
        onClick={handleButtonClick}
        className="w-8 h-8 flex items-center justify-center disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {children}
      </button>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-xs cursor-pointer disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <span>{label}</span>
        <svg className="w-3 h-3 ml-px" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-max">
          <ul>
            {items.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleItemClick(item.action)}
                  disabled={item.disabled}
                  className="w-full text-left px-4 py-1 text-sm hover:bg-blue-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400"
                >
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

export default RibbonDropdown;
