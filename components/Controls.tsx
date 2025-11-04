
import React from 'react';

interface ControlsProps {
  textColor: string;
  setTextColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  isBold: boolean;
  setIsBold: (bold: boolean) => void;
  isItalic: boolean;
  setIsItalic: (italic: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  textColor,
  setTextColor,
  fontFamily,
  setFontFamily,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
}) => {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Formatting Options</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
          <label htmlFor="textColor" className="text-sm font-medium text-slate-300">Text Color</label>
          <div className="relative w-8 h-8 rounded-md overflow-hidden border-2 border-slate-500">
             <input
              type="color"
              id="textColor"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            />
            <div className="w-full h-full" style={{ backgroundColor: textColor }}></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
          <label htmlFor="fontFamily" className="text-sm font-medium text-slate-300">Font</label>
          <select
            id="fontFamily"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-slate-600 border border-slate-500 text-white text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-1"
          >
            <option value="sans">Sans-Serif</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 flex items-center space-x-2 bg-slate-700/50 p-2 rounded-md">
            <button
                onClick={() => setIsBold(!isBold)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${isBold ? 'bg-indigo-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'}`}
            >
                B
            </button>
            <button
                onClick={() => setIsItalic(!isItalic)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold italic transition-colors ${isItalic ? 'bg-indigo-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'}`}
            >
                I
            </button>
        </div>

      </div>
    </div>
  );
};
