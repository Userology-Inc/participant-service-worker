// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import { type AudioBuffer, mergeFrames, stt } from '@livekit/agents';
import type { AudioFrame } from '@livekit/rtc-node';
import { Sarvam, SarvamTypes } from '../../services/sarvam.js';

export interface SarvamSTTOptions {
    apiKey: string;
    baseUrl?: string;
    language?: SarvamTypes.LanguageCode;
    model?: 'saarika:v1' | 'saarika:v2' | 'saarika:flash';
    withDiarization?: boolean;
    numSpeakers?: number;
    withTimestamps?: boolean;
}

const defaultSTTOptions: SarvamSTTOptions = {
    apiKey: process.env.SARVAM_API_KEY || '',
    language: 'en-IN',
    model: 'saarika:v2',
    withDiarization: false,
    withTimestamps: false,
};

export class STT extends stt.STT {
    #opts: SarvamSTTOptions;
    #client: Sarvam;
    label = 'sarvam.STT';

    /**
     * Create a new instance of Sarvam STT.
     *
     * @remarks
     * `apiKey` must be set to your Sarvam API key, either using the argument or by setting the
     * `SARVAM_API_KEY` environmental variable.
     */
    constructor(opts: Partial<SarvamSTTOptions> = {}) {
        super({ streaming: false, interimResults: false });

        this.#opts = { ...defaultSTTOptions, ...opts };
        if (!this.#opts.apiKey) {
            throw new Error('Sarvam API key is required, either as an argument or as $SARVAM_API_KEY');
        }

        this.#client = new Sarvam({
            apiKey: this.#opts.apiKey,
            baseUrl: this.#opts.baseUrl,
        });
    }

    #sanitizeOptions(language?: SarvamTypes.LanguageCode): SarvamSTTOptions {
        if (language) {
            return { ...this.#opts, language };
        } else {
            return this.#opts;
        }
    }

    #createWav(frame: AudioFrame): Blob {
        const bitsPerSample = 16;
        const byteRate = (frame.sampleRate * frame.channels * bitsPerSample) / 8;
        const blockAlign = (frame.channels * bitsPerSample) / 8;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + frame.data.byteLength, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(frame.channels, 22);
        header.writeUInt32LE(frame.sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(16, 34);
        header.write('data', 36);
        header.writeUInt32LE(frame.data.byteLength, 40);

        const audioData = Buffer.concat([header, Buffer.from(frame.data.buffer)]);
        return new Blob([audioData], { type: 'audio/wav' });
    }

    async _recognize(buffer: AudioBuffer, language?: SarvamTypes.LanguageCode): Promise<stt.SpeechEvent> {
        const config = this.#sanitizeOptions(language as SarvamTypes.LanguageCode);
        buffer = mergeFrames(buffer);

        const audioBlob = this.#createWav(buffer);

        const sttRequest = new SarvamTypes.STTRequest(
            audioBlob,
            {
                language_code: config.language,
                model: config.model,
                with_diarization: config.withDiarization,
                num_speakers: config.numSpeakers,
                with_timestamps: config.withTimestamps
            }
        );

        try {
            const response = await this.#client.speechToText(sttRequest);

            // Create alternatives from timestamps if available
            const alternatives: any = [];

            if (response.timestamps && response.timestamps.words.length > 0) {
                // Create alternatives with timestamp data
                for (let i = 0; i < response.timestamps.words.length; i++) {
                    alternatives.push({
                        text: response.timestamps.words[i],
                        language: config.language || '',
                        startTime: response.timestamps.start_time_seconds[i],
                        endTime: response.timestamps.end_time_seconds[i],
                        confidence: 1.0, // Sarvam doesn't provide confidence scores
                    });
                }
            } else {
                // Create single alternative with the entire transcript
                alternatives.push({
                    text: response.transcript || '',
                    language: response.language_code || config.language || '',
                    startTime: 0,
                    endTime: 0,
                    confidence: 1.0, // Sarvam doesn't provide confidence scores
                });
            }

            return {
                type: stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives,
            };
        } catch (error) {
            console.error('Sarvam STT error:', error);
            throw error;
        }
    }

    /** This method throws an error; streaming is unsupported on Sarvam STT. */
    stream(): stt.SpeechStream {
        throw new Error('Streaming is not supported on Sarvam STT');
    }

    /**
     * Static helper to get all supported languages
     */
    static getSupportedLanguages(): SarvamTypes.LanguageCode[] {
        return Sarvam.getSTTLanguages();
    }

    /**
     * Static helper to get all supported models
     */
    static getSupportedModels(): string[] {
        return Sarvam.getSTTModels();
    }
}