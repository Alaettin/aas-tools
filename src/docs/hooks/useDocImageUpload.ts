import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useDocImageUpload(manualId: string | undefined) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<string | null> => {
    if (!manualId) return null;
    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop() || 'png';
    const path = `${manualId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('doc-images')
      .upload(path, file);

    if (uploadErr) {
      setError('Bild konnte nicht hochgeladen werden.');
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage.from('doc-images').getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  };

  return { upload, uploading, error };
}
