
import React, { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { Controls } from './components/Controls';
import { OutputBox } from './components/OutputBox';
import { extractContentFromImage, Item } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

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

  // Formatting options state
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
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
      // The service now uses process.env.API_KEY directly
      const result = await extractContentFromImage(base64Image, mimeType);
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
  }, [imageFile]);

  const generatePdfDoc = useCallback((): jsPDF => {
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

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 relative">
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
