
import React, { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { Controls } from './components/Controls';
import { OutputBox } from './components/OutputBox';
import { extractContentFromImage, Item } from './services/geminiService';
import { fileToBase64, hasApiKey, setApiKey, clearApiKey } from './utils/fileUtils';

// A new component for the API Key selection screen
const ApiKeySelectionScreen = ({ 
  onSelect, 
  onSave,
  isManualMode,
  hasError 
}: { 
  onSelect: () => void, 
  onSave: (key: string) => void,
  isManualMode: boolean,
  hasError: boolean 
}) => {
    const [manualKey, setManualKey] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualKey.trim()) {
            onSave(manualKey.trim());
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
                <h1 className="text-3xl font-bold text-white mb-4">API Key Required</h1>
                <p className="text-slate-400 mb-6">
                    To use the Ink to Text Converter, you need a Google AI API key.
                </p>
                {hasError && (
                    <p className="text-red-400 bg-red-900/30 p-3 rounded-md mb-6 text-sm">
                        The provided API key was not valid. Please try again.
                    </p>
                )}
                {isManualMode ? (
                     <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input
                            type="password"
                            value={manualKey}
                            onChange={(e) => setManualKey(e.target.value)}
                            placeholder="Enter your API key here"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            aria-label="API Key Input"
                        />
                        <button
                            type="submit"
                            disabled={!manualKey.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg shadow-lg shadow-indigo-600/30"
                        >
                            Save & Continue
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={onSelect}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg shadow-lg shadow-indigo-600/30"
                    >
                        Select API Key
                    </button>
                )}
                <p className="text-xs text-slate-500 mt-4">
                    This application uses the Gemini API. For information about pricing, please see the{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                        billing documentation
                    </a>.
                </p>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [isAistudioEnv, setIsAistudioEnv] = useState(false);
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState<boolean>(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [convertedItems, setConvertedItems] = useState<Item[]>([]);
  const [otherText, setOtherText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Formatting options state
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  useEffect(() => {
    // @ts-ignore
    const hasAistudio = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
    setIsAistudioEnv(hasAistudio);
    
    const checkKey = async () => {
       if (hasAistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyReady(hasKey);
      } else {
        setIsKeyReady(hasApiKey());
      }
    };
    checkKey();

    if (navigator.share && typeof navigator.canShare === 'function') {
        const dummyFile = new File([""], "test.pdf", { type: "application/pdf" });
        if (navigator.canShare({ files: [dummyFile] })) {
            setIsShareApiAvailable(true);
        }
    }
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Optimistically set to true to avoid race conditions
        setIsKeyReady(true);
        setApiKeyError(false); // Clear previous API key errors
    }
  };
  
  const handleSaveKey = (key: string) => {
    setApiKey(key);
    setIsKeyReady(true);
    setApiKeyError(false);
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setConvertedItems([]);
    setOtherText('');
    setError(null);
  };

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setConvertedItems([]);
    setOtherText('');

    try {
      const base64Image = await fileToBase64(imageFile);
      const mimeType = imageFile.type;
      const result = await extractContentFromImage(base64Image, mimeType);
      setConvertedItems(result.items);
      setOtherText(result.otherText);
      setApiKeyError(false); // Reset error state on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      // Check for specific API key error message
      if (errorMessage.includes('API key not valid')) {
          if (!isAistudioEnv) {
            clearApiKey();
          }
          setIsKeyReady(false);
          setApiKeyError(true);
          setError(null); // Clear the generic error to show the key selection screen
      } else {
          setError(errorMessage);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, isAistudioEnv]);

  const generatePdfDoc = useCallback((): jsPDF => {
    const doc = new jsPDF();

    const fontMap = {
      sans: 'helvetica',
      serif: 'times',
      mono: 'courier',
    };

    let fontStyle = 'normal';
    if (isBold && isItalic) fontStyle = 'bolditalic';
    else if (isBold) fontStyle = 'bold';
    else if (isItalic) fontStyle = 'italic';
    
    const hexToRgb = (hex: string): [number, number, number] | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ];
    };
    
    const rgbTextColor = hexToRgb(textColor) || [0, 0, 0]; // Fallback to black for PDF visibility
    const margins = { left: 15, right: 15, top: 32 };
    let startY = margins.top;

    // Render "other text" if it exists
    if (otherText) {
      doc.setFont(fontMap[fontFamily] || 'helvetica', fontStyle as any);
      doc.setFontSize(10);
      doc.setTextColor(rgbTextColor[0], rgbTextColor[1], rgbTextColor[2]);
      const contentWidth = doc.internal.pageSize.getWidth() - margins.left - margins.right;
      const textLines = doc.splitTextToSize(otherText, contentWidth);
      doc.text(textLines, margins.left, startY);
      const lineHeight = doc.getFontSize() * 1.15;
      startY += textLines.length * lineHeight;
    }

    if (convertedItems.length > 0) {
        // Add padding between paragraph and table
        if (otherText) {
            startY += 5;
        }

        autoTable(doc, {
          head: [['Item Name', 'Rate (₹)']],
          body: convertedItems.map(i => [i.item, i.rate]),
          startY: startY,
          styles: {
            font: fontMap[fontFamily] || 'helvetica',
            fontStyle: fontStyle as any,
            textColor: rgbTextColor,
            cellPadding: 2.5,
            fontSize: 10,
          },
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 'auto' }, // Item Name
            1: { cellWidth: 40, halign: 'right' } // Rate
          },
          theme: 'grid',
          margin: { top: 32 },
          didDrawPage: (data) => {
            // Header for every page
            const shopName = "KASHI MOBILE SHOP";
            const title = "Ink to Text Converter";
            const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            
            // --- Line 1: Shop Name and Date ---
            doc.setFontSize(11);
            
            // Shop Name - with attractive, fixed color
            doc.setFont(undefined, 'bold');
            doc.setTextColor(236, 72, 153); // Vibrant Pink
            doc.text(shopName, data.settings.margin.left, 15);
    
            // Date - with a standard color
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(date, doc.internal.pageSize.getWidth() - data.settings.margin.right, 15, { align: 'right' });
    
            // --- Line 2: Main Title ---
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text(title, data.settings.margin.left, 25);
    
            // --- Footer for every page ---
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
        });
    }
    
    return doc;
  }, [convertedItems, otherText, textColor, fontFamily, isBold, isItalic]);

  const handleDownloadPdf = () => {
    if (convertedItems.length === 0 && !otherText) return;
    const doc = generatePdfDoc();
    doc.save('converted-document.pdf');
  };
  
  const handleSharePdf = async () => {
    if ((convertedItems.length === 0 && !otherText) || !isShareApiAvailable) return;
    const doc = generatePdfDoc();
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], 'converted-document.pdf', { type: 'application/pdf' });

    try {
        await navigator.share({
            files: [file],
            title: 'Converted Document',
            text: 'Here is your converted document.'
        });
    } catch (error) {
        console.error('Error sharing:', error);
        if ((error as Error).name !== 'AbortError') {
            setError('Could not share the file.');
        }
    }
  };

  const hasContent = convertedItems.length > 0 || !!otherText;

  if (!isKeyReady) {
    return <ApiKeySelectionScreen onSelect={handleSelectKey} onSave={handleSaveKey} isManualMode={!isAistudioEnv} hasError={apiKeyError} />;
  }


  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <Header />
        <main className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-6">
            <ImageUploader onImageSelect={handleImageSelect} imageUrl={imageUrl} />
            <Controls
              textColor={textColor}
              setTextColor={setTextColor}
              fontFamily={fontFamily}
              setFontFamily={setFontFamily}
              isBold={isBold}
              setIsBold={setIsBold}
              isItalic={isItalic}
              setIsItalic={setIsItalic}
            />
          </div>
          <div className="flex flex-col">
             <OutputBox
              items={convertedItems}
              otherText={otherText}
              isLoading={isLoading}
              error={error}
              textColor={textColor}
              fontFamily={fontFamily}
              isBold={isBold}
              isItalic={isItalic}
            />
          </div>
        </main>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleConvert}
            disabled={isLoading || !imageFile}
            className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting...
              </>
            ) : 'Convert Image'}
          </button>
           <button
            onClick={handleDownloadPdf}
            disabled={isLoading || !hasContent}
            className="w-full sm:flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900/50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg shadow-cyan-600/30"
          >
            Download PDF
          </button>
          {isShareApiAvailable && (
            <button
              onClick={handleSharePdf}
              disabled={isLoading || !hasContent}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900/50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg shadow-emerald-600/30"
            >
              Share PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
