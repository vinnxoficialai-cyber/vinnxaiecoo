import React, { useState, useRef } from 'react';
import { storageService } from '../services/storageService';

interface ImageUploadProps {
    currentImageUrl?: string;
    onImageUploaded: (url: string) => void;
    productId?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    currentImageUrl,
    onImageUploaded,
    productId = 'new'
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida.');
            return;
        }

        // Validar tamanho (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Imagem muito grande. Máximo 5MB.');
            return;
        }

        // Preview local
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload para Supabase
        setIsUploading(true);
        const url = await storageService.uploadProductImage(file, productId);
        setIsUploading(false);

        if (url) {
            setPreviewUrl(url);
            onImageUploaded(url);
        } else {
            alert('Erro ao fazer upload da imagem.');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400">Imagem do Produto</label>

            <div
                onClick={handleClick}
                className="border-2 border-dashed border-zinc-700 rounded-xl p-4 cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center min-h-[150px] bg-zinc-900/50"
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <span className="text-xs text-zinc-500">Enviando...</span>
                    </div>
                ) : previewUrl ? (
                    <div className="relative w-full">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-[150px] mx-auto rounded-lg object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-xs text-white font-medium">Clique para trocar</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Clique para adicionar imagem</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
};
