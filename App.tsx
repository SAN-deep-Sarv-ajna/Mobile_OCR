
import React, { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { Controls } from './components/Controls';
import { OutputBox } from './components/OutputBox';
import { extractContentFromImage, Item } from './services/geminiService';
import { fileToBase64, setApiKey, clearApiKey, getApiKey } from './utils/fileUtils';

// A new component for the API Key selection screen
const ApiKeySelectionScreen = ({ 
  onSelect, 
  onSave,
  isManualMode,
  errorMessage,
  hasExistingKey,
  onCancel
}: { 
  onSelect: () => void, 
  onSave: (key: string) => void,
  isManualMode: boolean,
  errorMessage: string | null,
  hasExistingKey: boolean,
  onCancel: () => void
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
                {errorMessage && (
                    <p className="text-red-400 bg-red-900/30 p-3 rounded-md mb-6 text-sm">
                        {errorMessage}
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
                        <div className="flex gap-3">
                            {hasExistingKey && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={!manualKey.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg shadow-lg shadow-indigo-600/30"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        onClick={onSelect}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg shadow-lg shadow-indigo-600/30"
                    >
                        Select API Key
                    </button>
                )}
                 <p className="text-xs text-slate-500 mt-6">
                    Your key is stored locally in your browser.
                </p>
                <p className="text-xs text-slate-500 mt-4">
                    For Gemini API billing information, visit the{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                        official documentation
                    </a>.
                </p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [isAistudioEnv, setIsAistudioEnv] = useState(false);
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState<boolean>(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [convertedItems, setConvertedItems] = useState<Item[]>([]);
  const [headerText, setHeaderText] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Formatting options state
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  useEffect(() => {
    // Determine which environment we are in first.
    // @ts-ignore
    const hasAistudio = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
    setIsAistudioEnv(hasAistudio);

    const checkKey = async () => {
      try {
          // Priority 1: Check for an API key from the environment (Vercel, AI Studio, etc.)
          if (process.env.API_KEY) {
            setActiveApiKey(process.env.API_KEY);
            setIsKeyReady(true);
            return;
          }
          
          // AI Studio check
          if (hasAistudio) {
            try {
                // @ts-ignore
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (hasKey) {
                    setActiveApiKey(process.env.API_KEY);
                    setIsKeyReady(true);
                    return;
                }
            } catch (err) {
                console.warn("AI Studio key check failed:", err);
            }
          }

          // Priority 2: Fallback to a key stored from a previous manual entry.
          const storedKey = getApiKey();
          if (storedKey) {
              setActiveApiKey(storedKey);
              setIsKeyReady(true);
              return;
          }
      } catch (err) {
          console.error("Error initializing API key:", err);
      }
    };
    checkKey();

    // Check for Share API availability
    try {
      if (navigator.share && typeof navigator.canShare === 'function') {
        const dummyFile = new File([''], 'test.pdf', { type: 'application/pdf' });
        if (navigator.canShare({ files: [dummyFile] })) {
          setIsShareApiAvailable(true);
        }
      }
    } catch (error) {
      console.warn('Web Share API for files not supported or check failed:', error);
      setIsShareApiAvailable(false);
    }
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setActiveApiKey(process.env.API_KEY || null);
        setIsKeyReady(true);
        setApiKeyError(null);
    }
  };
  
  const handleSaveKey = (key: string) => {
    setApiKey(key); // to localStorage
    setActiveApiKey(key); // to state
    setIsKeyReady(true);
    setApiKeyError(null);
  };
  
  const handleCancelKeyUpdate = () => {
    if (activeApiKey) {
        setIsKeyReady(true);
        setApiKeyError(null);
    }
  };
  
  const handleRequestKeyChange = () => {
      setIsKeyReady(false);
      setApiKeyError(null);
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setConvertedItems([]);
    setHeaderText('');
    setFooterText('');
    setError(null);
  };

  const handleConvert = useCallback(async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }
    if (!activeApiKey) {
      setError('API Key is missing. Please add a key.');
      setIsKeyReady(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setConvertedItems([]);
    setHeaderText('');
    setFooterText('');

    try {
      const base64Image = await fileToBase64(imageFile);
      const mimeType = imageFile.type;
      const result = await extractContentFromImage(base64Image, mimeType, activeApiKey);
      setConvertedItems(result.items);
      setHeaderText(result.headerText);
      setFooterText(result.footerText);
      setApiKeyError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      
      const isApiKeyError = errorMessage.includes('API key not valid') || 
                            errorMessage.includes('API key is not available') ||
                            /API key (.*?) not found/.test(errorMessage) ||
                            errorMessage.includes('provide one');

      if (isApiKeyError) {
          // Do not automatically clear the key from storage, just prompt the user.
          setError(null);
          setApiKeyError("Authentication failed. The API key provided is invalid or expired.");
          setIsKeyReady(false);
      } else {
          setError(errorMessage);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, activeApiKey]);

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
    
    const rgbTextColor: [number, number, number] = [40, 40, 40];
    
    const margins = { left: 15, right: 15, top: 32 };

    const didDrawPage = (data: any) => {
        // Page Header
        const shopName = "KASHI MOBILE SHOP";
        const title = "Ink to Text Converter";
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(236, 72, 153); // Vibrant Pink
        doc.text(shopName, data.settings.margin.left, 15);

        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(date, doc.internal.pageSize.getWidth() - data.settings.margin.right, 15, { align: 'right' });

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(title, data.settings.margin.left, 25);

        // Page Footer
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      };
      
    let startY = margins.top;
    let isAutoTableCalled = false;

    const textStyles = {
        font: fontMap[fontFamily] || 'helvetica',
        fontStyle: fontStyle as any,
        textColor: rgbTextColor,
        fontSize: 10,
    };

    if (headerText) {
        autoTable(doc, {
            body: [[headerText]],
            startY,
            theme: 'plain',
            styles: textStyles,
            margin: { left: margins.left, right: margins.right },
            didDrawPage,
        });
        startY = (doc as any).lastAutoTable.finalY + 5;
        isAutoTableCalled = true;
    }

    if (convertedItems.length > 0) {
        autoTable(doc, {
            head: [['Item Name', 'Rate (₹)']],
            body: convertedItems.map(i => [i.item, i.rate]),
            startY,
            styles: {
                ...textStyles,
                cellPadding: 2.5,
            },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 40, halign: 'right' }
            },
            theme: 'grid',
            margin: { left: margins.left, right: margins.right },
            didDrawPage,
        });
        startY = (doc as any).lastAutoTable.finalY + 5;
        isAutoTableCalled = true;
    }

    if (footerText) {
        autoTable(doc, {
            body: [[footerText]],
            startY,
            theme: 'plain',
            styles: textStyles,
            margin: { left: margins.left, right: margins.right },
            didDrawPage,
        });
        isAutoTableCalled = true;
    }

    if (!isAutoTableCalled) {
         autoTable(doc, {
            startY,
            margin: { left: margins.left, right: margins.right },
            didDrawPage,
        });
    }

    return doc;
  }, [convertedItems, headerText, footerText, fontFamily, isBold, isItalic]);

  const handleDownloadPdf = () => {
    if (convertedItems.length === 0 && !headerText && !footerText) return;
    const doc = generatePdfDoc();
    doc.save('converted-document.pdf');
  };
  
  const handleSharePdf = async () => {
    if ((convertedItems.length === 0 && !headerText && !footerText) || !isShareApiAvailable) return;
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

  const hasContent = convertedItems.length > 0 || !!headerText || !!footerText;

  if (!isKeyReady) {
    return (
        <ApiKeySelectionScreen 
            onSelect={handleSelectKey} 
            onSave={handleSaveKey} 
            isManualMode={!isAistudioEnv} 
            errorMessage={apiKeyError} 
            hasExistingKey={!!activeApiKey}
            onCancel={handleCancelKeyUpdate}
        />
    );
  }


  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
        {/* API Key Change Button */}
        {!isAistudioEnv && (
            <div className="absolute top-4 right-4 z-10">
                <button 
                    onClick={handleRequestKeyChange}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 9.636 11.536 9.636 10.586 8.686a2 2 0 00-2.828 0L6 10.414V13h2.828l8.757-8.757z" />
                    </svg>
                    API Key
                </button>
            </div>
        )}

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
              headerText={headerText}
              footerText={footerText}
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
