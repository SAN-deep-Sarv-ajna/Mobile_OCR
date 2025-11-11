
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { Controls } from './components/Controls';
import { OutputBox } from './components/OutputBox';
import { extractContentFromImage, Item } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const App: React.FC = () => {
  // App State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [convertedItems, setConvertedItems] = useState<Item[]>([]);
  const [headerText, setHeaderText] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState<boolean>(false);

  // API Key State
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Formatting options state
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      // Load API Key from storage
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
          setApiKey(storedKey);
      }

      // Check for Share API availability
      try {
        if (navigator.share && typeof navigator.canShare === 'function') {
            const dummyFile = new File([''], 'test.pdf', { type: 'application/pdf' });
            if (navigator.canShare({ files: [dummyFile] })) {
            setIsShareApiAvailable(true);
            }
        }
      } catch (error) {
        console.warn('Web Share API not supported:', error);
        setIsShareApiAvailable(false);
      }
    };
    init();
  }, []);

  const handleSaveApiKey = (key: string) => {
      setApiKey(key);
      localStorage.setItem('gemini_api_key', key);
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

    setIsLoading(true);
    setError(null);
    setConvertedItems([]);
    setHeaderText('');
    setFooterText('');

    try {
      const base64Image = await fileToBase64(imageFile);
      const mimeType = imageFile.type;
      // Pass the local apiKey to the service
      const result = await extractContentFromImage(base64Image, mimeType, apiKey);
      setConvertedItems(result.items);
      setHeaderText(result.headerText);
      setFooterText(result.footerText);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, apiKey]);

  const generatePdfDoc = useCallback(async () => {
    // Dynamically import libraries to reduce initial bundle size
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();

    const fontMap: Record<string, string> = {
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

  const handleDownloadPdf = async () => {
    if (convertedItems.length === 0 && !headerText && !footerText) return;
    setIsLoading(true);
    try {
      const doc = await generatePdfDoc();
      doc.save('converted-document.pdf');
    } catch (e) {
      console.error('Error generating PDF:', e);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSharePdf = async () => {
    if ((convertedItems.length === 0 && !headerText && !footerText) || !isShareApiAvailable) return;
    setIsLoading(true);
    try {
        const doc = await generatePdfDoc();
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], 'converted-document.pdf', { type: 'application/pdf' });

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
    } finally {
      setIsLoading(false);
    }
  };

  const hasContent = convertedItems.length > 0 || !!headerText || !!footerText;

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
      <div className="w-full max-w-4xl mx-auto relative">
        
        <div className="absolute top-0 right-0 z-10">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
                title="Settings"
            >
                <SettingsIcon />
            </button>
        </div>

        <Header />

        {showSettings && (
             <div className="mb-6 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 animate-fade-in-down">
                <h3 className="text-slate-200 font-semibold mb-2 text-sm">Settings</h3>
                <label className="block text-slate-400 mb-1 text-xs">Gemini API Key (Saved locally)</label>
                <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => {
                        setApiKey(e.target.value);
                        handleSaveApiKey(e.target.value);
                    }}
                    placeholder="Enter your API Key here..."
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                />
                 <p className="text-xs text-slate-500 mt-2">
                    Your API key is stored securely in your browser's local storage and is only used to communicate with Google's Gemini API.
                </p>
             </div>
         )}

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
                Processing...
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