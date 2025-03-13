import { type AudioBuffer, mergeFrames, stt } from '@livekit/agents';
import { ElevenLabs, ElevenLabsClient } from "elevenlabs";
import type { AudioFrame } from '@livekit/rtc-node';
import { SpeechToText } from 'elevenlabs/api/resources/speechToText/client/Client.js';
export interface STTOptions {
    apiKey?: string;
    client?: ElevenLabsClient;
    language_code?: string;
    enable_logging?: boolean;
    model_id?: string;
    tag_audio_events?: boolean;
    num_speakers?: number;
    diarize?: boolean;
    biased_keywords?: string[];
    maxRetries?: number;
    timeoutInSeconds?: number;
    timestamps_granularity?: 'none' | 'word' | 'character';
}
export interface STTOptions { }

const defaultSTTOptions: STTOptions = {
    apiKey: process.env.ELEVENLABS_API_KEY,
    model_id: 'scribe_v1',
    enable_logging: true,
    tag_audio_events: false,
    num_speakers: 1,
    timestamps_granularity: 'word',
    diarize: true,
    biased_keywords: [],
    language_code: 'hin',
    maxRetries: 3,
    timeoutInSeconds: 60,
}

export class STT extends stt.STT {
    #opts: STTOptions;
    #client: ElevenLabsClient;
    label = 'elevenlabs.STT';

    constructor(opts: Partial<STTOptions> = defaultSTTOptions) {
        super({ streaming: false, interimResults: false });

        this.#opts = { ...defaultSTTOptions, ...opts };
        if (this.#opts.apiKey === undefined) {
            throw new Error('ElevenLabs API key is required, whether as an argument or as $ELEVENLABS_API_KEY');
        }

        this.#client = this.#opts.client || new ElevenLabsClient({
            apiKey: this.#opts.apiKey,
        });

    }
    #sanitizeOptions(language?: string): STTOptions {
        if (language) {
            return { ...this.#opts, language_code: language };
        } else {
            return this.#opts;
        }
    }
    async _recognize(buffer: AudioBuffer, language?: string): Promise<stt.SpeechEvent> {
        const config = this.#sanitizeOptions(language);
        buffer = mergeFrames(buffer);
        const file = new File([this.#createWav(buffer)], 'audio.wav', { type: 'audio/wav' });
        const request: ElevenLabs.BodySpeechToTextV1SpeechToTextPost = {
            file,
            enable_logging: this.#opts.enable_logging || true,
            model_id: this.#opts.model_id || 'scribe_v1',
            language_code: config.language_code,
            tag_audio_events: this.#opts.tag_audio_events || false,
            num_speakers: this.#opts.num_speakers || 1,
            timestamps_granularity: this.#opts.timestamps_granularity || 'word',
            diarize: this.#opts.diarize || true,
            biased_keywords: this.#opts.biased_keywords || [],
        }
        const requestOptions: SpeechToText.RequestOptions = {
            maxRetries: this.#opts.maxRetries || 2,
            timeoutInSeconds: this.#opts.timeoutInSeconds || 60,
        }
        const resp = await this.#client.speechToText.convert(request, requestOptions);

        return {
            type: stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives: [
                {
                    text: resp.text || '',
                    language: language || '',
                    startTime: 0,
                    endTime: 0,
                    confidence: 0,
                },
            ],
        };

    }
    #createWav(frame: AudioFrame): Buffer {
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
        return Buffer.concat([header, Buffer.from(frame.data.buffer)]);
    }
    /** This method throws an error; streaming is unsupported on OpenAI STT. */
    stream(): stt.SpeechStream {
        throw new Error('Streaming is not supported on OpenAI STT');
    }
}

