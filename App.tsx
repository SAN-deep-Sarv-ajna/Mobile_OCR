
import React, { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { Controls } from './components/Controls';
import { OutputBox } from './components/OutputBox';
import { extractItemsAndRates, Item } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// A new component for the API Key selection screen
const ApiKeySelectionScreen = ({ onSelect, hasError }: { onSelect: () => void, hasError: boolean }) => (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
            <h1 className="text-3xl font-bold text-white mb-4">API Key Required</h1>
            <p className="text-slate-400 mb-6">
                To use the Ink to Text Converter, you need to select a Google AI API key.
            </p>
            {hasError && (
                <p className="text-red-400 bg-red-900/30 p-3 rounded-md mb-6 text-sm">
                    The previously selected API key was not valid. Please select a different one.
                </p>
            )}
            <button
                onClick={onSelect}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg shadow-lg shadow-indigo-600/30"
            >
                Select API Key
            </button>
            <p className="text-xs text-slate-500 mt-4">
                This application uses the Gemini API. For information about pricing, please see the{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    billing documentation
                </a>.
            </p>
        </div>
    </div>
);


const App: React.FC = () => {
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [convertedItems, setConvertedItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Formatting options state
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyReady(hasKey);
      }
    };
    checkKey();
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

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setConvertedItems([]);
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

    try {
      const base64Image = await fileToBase64(imageFile);
      const mimeType = imageFile.type;
      const result = await extractItemsAndRates(base64Image, mimeType);
      setConvertedItems(result);
      setApiKeyError(false); // Reset error state on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      // Check for specific API key error message
      if (errorMessage.includes('API key not valid')) {
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
  }, [imageFile]);

  const handleDownloadPdf = () => {
    if (convertedItems.length === 0) return;

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
    
    autoTable(doc, {
      head: [['Item Name', 'Rate (₹)']],
      body: convertedItems.map(i => [i.item, i.rate]),
      styles: {
        font: fontMap[fontFamily] || 'helvetica',
        fontStyle: fontStyle as any,
        textColor: textColor,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      theme: 'grid',
    });
    
    doc.save('business-items.pdf');
  };

  if (!isKeyReady) {
    return <ApiKeySelectionScreen onSelect={handleSelectKey} hasError={apiKeyError} />;
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
              isLoading={isLoading}
              error={error}
              textColor={textColor}
              fontFamily={fontFamily}
              isBold={isBold}
              isItalic={isItalic}
            />
          </div>
        </main>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleConvert}
            disabled={isLoading || !imageFile}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg shadow-indigo-600/30"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Converting...
              </>
            ) : 'Convert Image'}
          </button>
           <button
            onClick={handleDownloadPdf}
            disabled={isLoading || convertedItems.length === 0}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900/50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg shadow-cyan-600/30"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
