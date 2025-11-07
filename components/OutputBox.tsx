
import React, { useState, useEffect } from 'react';
import { Item } from '../services/geminiService';

interface OutputBoxProps {
  items: Item[];
  headerText: string;
  footerText: string;
  isLoading: boolean;
  error: string | null;
  textColor: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

export const OutputBox: React.FC<OutputBoxProps> = ({
  items,
  headerText,
  footerText,
  isLoading,
  error,
  textColor,
  fontFamily,
  isBold,
  isItalic,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = () => {
    const parts = [];
    if (headerText) parts.push(headerText);
    if (items && items.length > 0) {
      parts.push(items.map(i => `${i.item}\t₹${i.rate}`).join('\n'));
    }
    if (footerText) parts.push(footerText);
    
    const textToCopy = parts.join('\n\n');

    if(textToCopy.trim()){
      navigator.clipboard.writeText(textToCopy.trim());
      setIsCopied(true);
    }
  };

  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[fontFamily] || 'font-sans';

  const styleClasses = [
    fontClass,
    isBold ? 'font-bold' : 'font-normal',
    isItalic ? 'italic' : 'not-italic',
  ].join(' ');

  const hasContent = items.length > 0 || !!headerText || !!footerText;
  
  const renderTextWithLineBreaks = (text: string) => (
    <p>
      {text.split('\n').map((line, index, array) => (
        <React.Fragment key={index}>
          {line}
          {index < array.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
           <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          <p className="mt-4">Analyzing your handwriting...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-center text-red-400">
          <p>Error: {error}</p>
        </div>
      );
    }
    
    if (!hasContent) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <p>Your converted content will appear here.</p>
        </div>
      );
    }
    
    return (
      <div className={styleClasses} style={{ color: textColor }}>
        {headerText && <div className="mb-4">{renderTextWithLineBreaks(headerText)}</div>}
        {items && items.length > 0 && (
            <table className="w-full text-left">
                <thead>
                <tr className="border-b border-slate-600">
                    <th className="p-2">Item Name</th>
                    <th className="p-2 text-right">Rate (₹)</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-700 last:border-b-0">
                    <td className="p-2">{item.item}</td>
                    <td className="p-2 text-right">{item.rate}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
        {footerText && <div className="mt-4">{renderTextWithLineBreaks(footerText)}</div>}
      </div>
    );
  };
  
  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-0 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col">
      <div className="flex-grow p-4 overflow-auto">
        {renderContent()}
      </div>
       {hasContent && !isLoading && !error && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Copy as text"
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}
    </div>
  );
};
