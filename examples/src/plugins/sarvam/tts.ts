// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import { AudioByteStream, tts } from '@livekit/agents';
import type { AudioFrame } from '@livekit/rtc-node';
import { randomUUID } from 'crypto';
import { Sarvam, SarvamTypes } from '../../services/sarvam.js';

// Define sample rates that match Sarvam's capabilities
const SARVAM_TTS_SAMPLE_RATE = 22050; // Default sample rate
const SARVAM_TTS_CHANNELS = 1;

export type SarvamTTSVoice = SarvamTypes.TTSSpeaker;
export type SarvamLanguageCode = Exclude<SarvamTypes.LanguageCode, "unknown">;

export interface TTSOptions {
    apiKey: string;
    baseURL?: string;
    voice?: SarvamTTSVoice;
    language: SarvamLanguageCode;
    pitch?: number;
    pace?: number;
    loudness?: number;
    sampleRate?: SarvamTypes.TTSSampleRate;
    client?: Sarvam;
}

const defaultTTSOptions: TTSOptions = {
    apiKey: process.env.SARVAM_API_KEY || '',
    language: 'en-IN',
    voice: 'meera',
    sampleRate: SARVAM_TTS_SAMPLE_RATE as SarvamTypes.TTSSampleRate,
};

class TTS extends tts.TTS {
    #opts: TTSOptions;
    #client: Sarvam;
    label = 'sarvam.TTS';

    /**
     * Create a new instance of Sarvam TTS.
     *
     * @remarks
     * `apiKey` must be set to your Sarvam API key, either using the argument or by setting the
     * `SARVAM_API_KEY` environmental variable.
     */
    constructor(opts: Partial<TTSOptions> = {}) {
        // Get the actual sample rate from options or default
        const sampleRate = opts.sampleRate || defaultTTSOptions.sampleRate || SARVAM_TTS_SAMPLE_RATE;

        super(sampleRate, SARVAM_TTS_CHANNELS, { streaming: false });

        this.#opts = { ...defaultTTSOptions, ...opts };
        if (!this.#opts.apiKey) {
            throw new Error('Sarvam API key is required, either as an argument or as $SARVAM_API_KEY');
        }

        this.#client = this.#opts.client ||
            new Sarvam({
                apiKey: this.#opts.apiKey,
                baseUrl: this.#opts.baseURL
            });
    }

    /**
     * Update the TTS options
     */
    updateOptions(opts: {
        voice?: SarvamTTSVoice;
        language?: SarvamLanguageCode;
        pitch?: number;
        pace?: number;
        loudness?: number;
        sampleRate?: SarvamTypes.TTSSampleRate;
    }) {
        this.#opts = { ...this.#opts, ...opts };
    }

    /**
     * Synthesize text to speech
     */
    synthesize(text: string): ChunkedStream {
        const request = new SarvamTypes.TTSRequest(
            [text],  // Sarvam accepts an array of texts
            this.#opts.language,
            {
                speaker: this.#opts.voice,
                pitch: this.#opts.pitch,
                pace: this.#opts.pace,
                loudness: this.#opts.loudness,
                speech_sample_rate: this.#opts.sampleRate,
                enable_preprocessing: true,
                model: "bulbul:v1"
            }
        );

        return new ChunkedStream(
            this,
            text,
            this.#client.textToSpeech(request)
        );
    }

    /**
     * Streaming is not supported by Sarvam TTS API
     */
    stream(): tts.SynthesizeStream {
        throw new Error('Streaming is not supported on Sarvam TTS');
    }
}

class ChunkedStream extends tts.ChunkedStream {
    label = 'sarvam.ChunkedStream';

    constructor(tts: TTS, text: string, sarvamPromise: Promise<SarvamTypes.TTSResponse>) {
        super(text, tts);
        this.#run(sarvamPromise);
    }

    async #run(sarvamPromise: Promise<SarvamTypes.TTSResponse>) {
        try {
            const response = await sarvamPromise;
            const requestId = response.request_id || randomUUID();

            // Process each audio in the response
            // Sarvam returns an array of base64-encoded audio files

            for (let i = 0; i < response.audios.length; i++) {
                const base64Audio = response.audios[i];
                if (!base64Audio) {
                    throw new Error('No audio data received from Sarvam');
                }
                const buffer = Buffer.from(base64Audio, 'base64');

                // Create a segmentId for each audio segment
                const segmentId = `${requestId}-${i}`;

                // Convert the base64 buffer to audio frames
                const audioByteStream = new AudioByteStream(
                    (tts as any).sampleRate,
                    SARVAM_TTS_CHANNELS
                );

                const frames = audioByteStream.write(buffer);

                let lastFrame: AudioFrame | undefined;
                const sendLastFrame = (final: boolean) => {
                    if (lastFrame) {
                        this.queue.put({
                            requestId,
                            segmentId,
                            frame: lastFrame,
                            final,
                            // We could include deltaText here if we had it from the response
                        });
                        lastFrame = undefined;
                    }
                };

                for (const frame of frames) {
                    sendLastFrame(false);
                    lastFrame = frame;
                }

                // Final frame for this segment
                sendLastFrame(true);
            }
        } catch (error) {
            console.error('Error in Sarvam TTS:', error);
        } finally {
            this.queue.close();
        }
    }
}

