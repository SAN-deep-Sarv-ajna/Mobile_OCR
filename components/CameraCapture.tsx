
import React, { useState, useRef, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize camera
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        // Clean up any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });

        // If component unmounted during the async call, stop the stream immediately
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error("Error accessing camera:", err);
          setError("Could not access camera. Please ensure permissions are granted and you have a camera available.");
        }
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        // Pause stream visualization but keep stream open in case user retakes
        if (videoRef.current) {
            videoRef.current.pause();
        }
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current && streamRef.current) {
        videoRef.current.play();
    }
  };
  
  const handleUsePhoto = () => {
    if (canvasRef.current) {
        canvasRef.current.toBlob(blob => {
            if (blob) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
            }
        }, 'image/jpeg', 0.95);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl relative overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {error ? (
          <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-red-400 mb-4">Camera Error</h3>
            <p className="text-slate-300">{error}</p>
          </div>
        ) : capturedImage ? (
            <div>
                <img src={capturedImage} alt="Captured" className="w-full h-auto" />
            </div>
        ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
        )}

        <div className="absolute top-2 right-2">
            <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors" aria-label="Close camera">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {!error && (
            <div className="bg-slate-900/80 p-4 flex justify-center items-center gap-4">
            {capturedImage ? (
                <>
                    <button onClick={handleRetake} className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">Retake</button>
                    <button onClick={handleUsePhoto} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">Use Photo</button>
                </>
            ) : (
                <button onClick={handleCapture} className="p-4 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500" aria-label="Capture photo">
                    <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-900 ring-2 ring-white"></div>
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;