
import React, { useRef } from 'react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  imageUrl: string | null;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);


export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imageUrl }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="w-full p-4 border-2 border-dashed border-slate-700 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors duration-300 bg-slate-800/50 flex items-center justify-center aspect-video"
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {imageUrl ? (
        <img src={imageUrl} alt="Handwriting preview" className="max-w-full max-h-full object-contain rounded-md" />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400">
          <UploadIcon />
          <p className="mt-2 font-semibold">Click to upload an image</p>
          <p className="text-sm text-slate-500">PNG, JPG, WEBP, etc.</p>
        </div>
      )}
    </div>
  );
};
