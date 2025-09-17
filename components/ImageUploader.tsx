import React, { useCallback, useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UploadIcon, ClearIcon } from './ui/Icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  imagePreviewUrl: string | null;
  isLoading: boolean;
  onClear: () => void;
  hasUploadedImage: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  imagePreviewUrl, 
  isLoading,
  onClear,
  hasUploadedImage
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  }, [onImageUpload]);

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <Card className={isLoading ? 'opacity-70 pointer-events-none' : ''}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-purple-400">Upload Your Parlay Image</h2>
        
        <div 
          className={`border-2 ${dragActive ? 'border-purple-500 bg-gray-800' : 'border-gray-600 border-dashed'} rounded-lg p-8 text-center transition-colors duration-200 ease-in-out`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="imageUploadInput"
            disabled={isLoading}
          />
          <label 
            htmlFor="imageUploadInput"
            className={`cursor-pointer flex flex-col items-center justify-center ${isLoading ? 'pointer-events-none' : ''}`}
          >
            <UploadIcon className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-300 mb-1">
              {dragActive ? "Drop the image here..." : "Drag & drop an image, or click to select"}
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            <Button 
              type="button" 
              onClick={openFileDialog} 
              variant="secondary" 
              size="sm" 
              className="mt-4"
              disabled={isLoading}
            >
              Choose Image
            </Button>
          </label>
        </div>

        {imagePreviewUrl && (
          <div className="mt-6 text-center">
            <h3 className="text-md font-semibold text-gray-300 mb-2">Image Preview:</h3>
            <div className="relative inline-block">
                <img 
                    src={imagePreviewUrl} 
                    alt="Parlay preview" 
                    className="max-w-full max-h-60 rounded-md shadow-lg border border-gray-600"
                />
                {hasUploadedImage && !isLoading && (
                    <Button 
                        onClick={onClear} 
                        variant="danger" 
                        size="sm" 
                        className="absolute -top-2 -right-2 p-1.5 rounded-full"
                        aria-label="Clear uploaded image and analysis"
                    >
                        <ClearIcon className="w-4 h-4" />
                    </Button>
                )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};