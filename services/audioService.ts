import { supabase } from '../lib/supabase';

// ElevenLabs free tier: 10,000 characters/month ≈ 1,000+ word pronunciations
const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;

// Rachel voice — clear, neutral American English
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function generateAndUploadAudio(word: string): Promise<string> {
    if (!elevenLabsKey) {
        throw new Error(
            'ElevenLabs API key not configured. Add VITE_ELEVENLABS_API_KEY to your .env.local and Vercel environment variables.'
        );
    }

    // 1 — Call ElevenLabs TTS
    const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
                text: word,
                model_id: 'eleven_monolingual_v1',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        }
    );

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`ElevenLabs ${res.status}: ${body}`);
    }

    const audioBlob = await res.blob();

    // 2 — Upload to Supabase Storage
    const fileName = `ai_${Date.now()}_${word.toLowerCase().replace(/\s+/g, '_')}.mp3`;

    const { error: uploadError } = await supabase.storage
        .from('word-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/mpeg' });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('word-audio')
        .getPublicUrl(fileName);

    return publicUrl;
}
