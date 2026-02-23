import { useState, useRef } from 'react';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  helpText?: string;
  className?: string;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  placeholder = 'Click to upload or drag and drop',
  helpText,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {value ? (
        // Preview mode
        <div className="relative group">
          <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
            >
              Remove
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        // Upload mode
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          className={`
            relative w-full h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer
            flex flex-col items-center justify-center gap-2
            ${dragActive
              ? 'border-foremark-green bg-foremark-green/5'
              : 'border-gray-300 hover:border-foremark-green hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-foremark-green border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </>
          ) : (
            <>
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-500">{placeholder}</span>
              <span className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</span>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {helpText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}

      {/* Allow manual URL input as fallback */}
      <div className="mt-2">
        <details className="text-xs">
          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
            Or paste image URL
          </summary>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            placeholder="https://..."
          />
        </details>
      </div>
    </div>
  );
}
