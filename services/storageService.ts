import { supabase } from './supabaseClient';

const BUCKET_NAME = 'product-images';

export const storageService = {
    // Upload de imagem de produto
    uploadProductImage: async (file: File, productId: string): Promise<string | null> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Erro ao fazer upload:', uploadError);
            return null;
        }

        // Retorna a URL pública da imagem
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // Deletar imagem antiga
    deleteProductImage: async (imageUrl: string): Promise<void> => {
        if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return;

        // Extrai o path do arquivo da URL
        const pathMatch = imageUrl.match(/products\/[^?]+/);
        if (!pathMatch) return;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([pathMatch[0]]);

        if (error) {
            console.error('Erro ao deletar imagem:', error);
        }
    }
};
