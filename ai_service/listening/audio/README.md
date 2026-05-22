# Listening Audio Files

Place IELTS-style audio `.wav` files in this directory before running the cache builder.

## Requirements

- Format: `.wav` (PCM, mono or stereo — Whisper handles both)
- Duration: 2–5 minutes per file (typical IELTS section length)
- Naming: any filename is fine (e.g. `section1.wav`, `lecture_a.wav`)
- Count: at least 4 files recommended (one per IELTS section)

## How audio is used

## MIND FUCK

1. `cache_builder.py` reads every `.wav` file here.
2. Transcribes each with OpenAI Whisper.
3. Sends the transcript to Gemini 2.5 Flash to generate 10 IELTS listening questions per file.
4. Saves the result to `listening_cache.json`.

When `POST /listening/generate` is called, the service randomly picks 4 cached sections
and returns them with audio URLs pointing to `/uploads/audio/<filename>`.

## Getting audio files

You can use:

- Real IELTS listening practice audio (Cambridge IELTS series, etc.)
- Any English audio recording (lecture, conversation, interview)
- Synthetically generated audio via TTS tools

## After placing files

Run from the `ai_service/` directory:

```bash
python listening/cache_builder.py
```

Then copy the audio files to the backend's uploads directory so Express can serve them:

```bash
# Adjust path to match your backend location
cp listening/audio/*.wav ../IELTS_PREP/backend/uploads/audio/
```
