import React, { useState, useRef } from 'react';

interface TooltipProps {
  children: React.ReactElement;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => setVisible(true);
  const handleMouseLeave = () => setVisible(false);

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center"
    >
      {children}
      {visible && (
        <div
          className="absolute bottom-full mb-2 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded-md shadow-lg"
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;