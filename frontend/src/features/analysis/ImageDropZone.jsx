// frontend/src/features/analysis/ImageDropZone.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ImageDropZone = ({ onFileSelect, disabled }) => {
    const inputRef      = useRef(null);
    const [preview, setPreview]   = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError]       = useState('');
    const [dragging, setDragging] = useState(false);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    useEffect(() => {
        const handlePaste = (e) => {
            if (disabled) return;
            const items = Array.from(e.clipboardData?.items || []);
            const imageItem = items.find(i => i.type.startsWith('image/'));
            if (imageItem) _processFile(imageItem.getAsFile());
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [disabled]);

    const _processFile = (file) => {
        if (!file) return;
        setError('');
        if (file.size > MAX_BYTES) {
            setError('Görsel 25 MB\'dan büyük olamaz.');
            return;
        }
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        setFileName(file.name || 'pano görseli');
        onFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) _processFile(file);
    };

    const clearFile = (e) => {
        e.stopPropagation();
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setFileName('');
        setError('');
        onFileSelect(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="flex-grow flex flex-col justify-center px-4 md:px-6 py-4 gap-3">
            <div
                onClick={() => !disabled && !preview && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`
                    relative flex flex-col items-center justify-center
                    rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                    min-h-[140px] gap-3 p-4
                    ${dragging ? 'border-brand bg-brand/5' : 'border-brutal-border dark:border-surface-solid hover:border-tx-secondary'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${preview ? 'cursor-default' : ''}
                `}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="Önizleme" className="max-h-32 max-w-full rounded-lg object-contain" />
                        <span className="text-xs text-tx-secondary truncate max-w-full">{fileName}</span>
                        {!disabled && (
                            <button
                                onClick={clearFile}
                                className="absolute top-2 right-2 p-1 rounded-full bg-surface-solid hover:bg-brutal-border transition-colors"
                                title="Görseli kaldır"
                            >
                                <X className="w-3.5 h-3.5 text-tx-secondary" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-bg-surface-solid)' }}>
                            <ImageIcon className="w-6 h-6 text-tx-secondary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-tx-primary">
                                Görsel yapıştır <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-solid border border-brutal-border">Ctrl+V</kbd>
                            </p>
                            <p className="text-xs text-tx-secondary mt-1">
                                veya tıklayarak seç · Sürükle & bırak · Maks 25 MB
                            </p>
                        </div>
                    </>
                )}
            </div>
            {error && <p className="text-xs text-es-error text-center">{error}</p>}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => _processFile(e.target.files?.[0])}
                disabled={disabled}
            />
        </div>
    );
};

export default ImageDropZone;
