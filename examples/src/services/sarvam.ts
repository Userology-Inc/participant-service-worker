export namespace SarvamTypes {
    /**
     * Language codes supported by Sarvam TTS and STT
     */
    export type LanguageCode =
        | "hi-IN" | "bn-IN" | "kn-IN" | "ml-IN" | "mr-IN"
        | "od-IN" | "pa-IN" | "ta-IN" | "te-IN" | "en-IN" | "gu-IN"
        | "unknown";

    /**
     * Speakers available for Text-to-Speech
     */
    export type TTSSpeaker =
        | "meera" | "pavithra" | "maitreyi" | "arvind" | "amol"
        | "amartya" | "diya" | "neel" | "misha" | "vian" | "arjun" | "maya";

    /**
     * Supported sample rates for Text-to-Speech
     */
    export type TTSSampleRate = 8000 | 16000 | 22050;

    /**
     * Text-to-Speech request parameters
     */
    export class TTSRequest {
        /** The text(s) to be converted into speech (required) */
        inputs: string[];

        /** The language of the text (required) */
        target_language_code: Exclude<LanguageCode, "unknown">;

        /** The speaker to be used for the output audio (optional, default: "meera") */
        speaker?: TTSSpeaker | null;

        /** Controls the pitch of the audio, between -0.75 and 0.75 (optional) */
        pitch?: number | null;

        /** Controls the speed of the audio, between 0.5 and 2.0 (optional, default: 1.0) */
        pace?: number | null;

        /** Controls the loudness of the audio, between 0.3 and 3.0 (optional, default: 1.0) */
        loudness?: number | null;

        /** Specifies the sample rate of the output audio (optional, default: 22050) */
        speech_sample_rate?: TTSSampleRate | null;

        /** Controls normalization of English words and numeric entities (optional, default: false) */
        enable_preprocessing?: boolean;

        /** Specifies the model to use for text-to-speech conversion (optional) */
        model?: "bulbul:v1";

        /** Weight for interpolating with English speaker at encoder (optional) */
        eng_interpolation_wt?: number | null;

        /** Override the default speaker triplets (optional) */
        override_triplets?: Record<string, any>;

        constructor(
            inputs: string[],
            target_language_code: Exclude<LanguageCode, "unknown">,
            options: {
                speaker?: TTSSpeaker | null,
                pitch?: number | null,
                pace?: number | null,
                loudness?: number | null,
                speech_sample_rate?: TTSSampleRate | null,
                enable_preprocessing?: boolean,
                model?: "bulbul:v1",
                eng_interpolation_wt?: number | null,
                override_triplets?: Record<string, any>
            } = {}
        ) {
            this.inputs = inputs;
            this.target_language_code = target_language_code;

            // Optional parameters
            if (options.speaker !== undefined) this.speaker = options.speaker;
            if (options.pitch !== undefined) this.pitch = options.pitch;
            if (options.pace !== undefined) this.pace = options.pace;
            if (options.loudness !== undefined) this.loudness = options.loudness;
            if (options.speech_sample_rate !== undefined) this.speech_sample_rate = options.speech_sample_rate;
            if (options.enable_preprocessing !== undefined) this.enable_preprocessing = options.enable_preprocessing;
            if (options.model !== undefined) this.model = options.model;
            if (options.eng_interpolation_wt !== undefined) this.eng_interpolation_wt = options.eng_interpolation_wt;
            if (options.override_triplets !== undefined) this.override_triplets = options.override_triplets;
        }

        /**
         * Convert the TTSRequest instance to a plain JSON object
         */
        toJson(): Record<string, any> {
            const json: Record<string, any> = {
                inputs: this.inputs,
                target_language_code: this.target_language_code
            };

            if (this.speaker !== undefined) json.speaker = this.speaker;
            if (this.pitch !== undefined) json.pitch = this.pitch;
            if (this.pace !== undefined) json.pace = this.pace;
            if (this.loudness !== undefined) json.loudness = this.loudness;
            if (this.speech_sample_rate !== undefined) json.speech_sample_rate = this.speech_sample_rate;
            if (this.enable_preprocessing !== undefined) json.enable_preprocessing = this.enable_preprocessing;
            if (this.model !== undefined) json.model = this.model;
            if (this.eng_interpolation_wt !== undefined) json.eng_interpolation_wt = this.eng_interpolation_wt;
            if (this.override_triplets !== undefined) json.override_triplets = this.override_triplets;

            return json;
        }

        /**
         * Create a TTSRequest instance from a plain JSON object
         */
        static fromJson(json: Record<string, any>): TTSRequest {
            if (!json.inputs || !json.target_language_code) {
                throw new Error("Invalid TTSRequest JSON: missing required fields");
            }

            return new TTSRequest(
                json.inputs,
                json.target_language_code,
                {
                    speaker: json.speaker,
                    pitch: json.pitch,
                    pace: json.pace,
                    loudness: json.loudness,
                    speech_sample_rate: json.speech_sample_rate,
                    enable_preprocessing: json.enable_preprocessing,
                    model: json.model,
                    eng_interpolation_wt: json.eng_interpolation_wt,
                    override_triplets: json.override_triplets
                }
            );
        }
    }

    /**
     * Text-to-Speech response
     */
    export class TTSResponse {
        /** Request ID (optional) */
        request_id: string | null;

        /** The output audio files in WAV format, encoded as base64 strings */
        audios: string[];

        constructor(data: { request_id: string | null, audios: string[] }) {
            this.request_id = data.request_id;
            this.audios = data.audios;
        }

        /**
         * Convert the TTSResponse instance to a plain JSON object
         */
        toJson(): Record<string, any> {
            return {
                request_id: this.request_id,
                audios: this.audios
            };
        }

        /**
         * Create a TTSResponse instance from a plain JSON object
         */
        static fromJson(json: Record<string, any>): TTSResponse {
            return new TTSResponse({
                request_id: json.request_id || null,
                audios: json.audios || []
            });
        }
    }

    /**
     * Speech-to-Text request parameters
     */
    export class STTRequest {
        /** The audio file to transcribe (required) */
        file: File | Blob;

        /** Specifies the model to use for speech-to-text conversion (optional) */
        model?: "saarika:v1" | "saarika:v2" | "saarika:flash";

        /** Specifies the language of the input audio (optional) */
        language_code?: LanguageCode;

        /** Enables timestamps in the response (optional, default: false) */
        with_timestamps?: boolean;

        /** Enables speaker diarization (optional, default: false) */
        with_diarization?: boolean;

        /** Number of speakers to be detected in the audio (optional) */
        num_speakers?: number | null;

        constructor(
            file: File | Blob,
            options: {
                model?: "saarika:v1" | "saarika:v2" | "saarika:flash",
                language_code?: LanguageCode,
                with_timestamps?: boolean,
                with_diarization?: boolean,
                num_speakers?: number | null
            } = {}
        ) {
            this.file = file;

            // Optional parameters
            if (options.model !== undefined) this.model = options.model;
            if (options.language_code !== undefined) this.language_code = options.language_code;
            if (options.with_timestamps !== undefined) this.with_timestamps = options.with_timestamps;
            if (options.with_diarization !== undefined) this.with_diarization = options.with_diarization;
            if (options.num_speakers !== undefined) this.num_speakers = options.num_speakers;
        }

        /**
         * Note: toJson for STTRequest is not fully implemented since File/Blob cannot be serialized directly.
         * This returns parameters excluding the file which needs to be handled separately with FormData.
         */
        toJson(): Record<string, any> {
            const json: Record<string, any> = {};

            if (this.model !== undefined) json.model = this.model;
            if (this.language_code !== undefined) json.language_code = this.language_code;
            if (this.with_timestamps !== undefined) json.with_timestamps = this.with_timestamps;
            if (this.with_diarization !== undefined) json.with_diarization = this.with_diarization;
            if (this.num_speakers !== undefined) json.num_speakers = this.num_speakers;

            return json;
        }

        /**
         * Create FormData from this request for API submission
         */
        toFormData(): FormData {
            const formData = new FormData();
            formData.append("file", this.file);

            if (this.model) formData.append("model", this.model);
            if (this.language_code) formData.append("language_code", this.language_code);
            if (this.with_timestamps !== undefined) formData.append("with_timestamps", this.with_timestamps.toString());
            if (this.with_diarization !== undefined) formData.append("with_diarization", this.with_diarization.toString());
            if (this.num_speakers !== undefined && this.num_speakers !== null) {
                formData.append("num_speakers", this.num_speakers.toString());
            }

            return formData;
        }
    }

    /**
     * Speech-to-Text response
     */
    export class STTResponse {
        /** Request ID (optional) */
        request_id: string | null;

        /** The transcribed text from the provided audio file */
        transcript: string;

        /** Contains timestamps for the transcribed text (optional) */
        timestamps?: {
            end_time_seconds: number[];
            start_time_seconds: number[];
            words: string[];
        } | null;

        /** Diarized transcript of the provided speech (optional) */
        diarized_transcript?: Record<string, any> | null;

        /** BCP-47 code of language spoken in the input (optional) */
        language_code?: string | null;

        constructor(data: {
            request_id: string | null,
            transcript: string,
            timestamps?: {
                end_time_seconds: number[];
                start_time_seconds: number[];
                words: string[];
            } | null,
            diarized_transcript?: Record<string, any> | null,
            language_code?: string | null
        }) {
            this.request_id = data.request_id;
            this.transcript = data.transcript;
            this.timestamps = data.timestamps;
            this.diarized_transcript = data.diarized_transcript;
            this.language_code = data.language_code;
        }

        /**
         * Convert the STTResponse instance to a plain JSON object
         */
        toJson(): Record<string, any> {
            const json: Record<string, any> = {
                request_id: this.request_id,
                transcript: this.transcript
            };

            if (this.timestamps) json.timestamps = this.timestamps;
            if (this.diarized_transcript) json.diarized_transcript = this.diarized_transcript;
            if (this.language_code) json.language_code = this.language_code;

            return json;
        }

        /**
         * Create an STTResponse instance from a plain JSON object
         */
        static fromJson(json: Record<string, any>): STTResponse {
            return new STTResponse({
                request_id: json.request_id || null,
                transcript: json.transcript || "",
                timestamps: json.timestamps || null,
                diarized_transcript: json.diarized_transcript || null,
                language_code: json.language_code || null
            });
        }
    }
}

export class Sarvam {
    private apiKey: string;
    private baseUrl: string;

    /**
     * Creates a new Sarvam client instance
     * @param apiKey Your Sarvam API subscription key
     * @param baseUrl Optional base URL for the Sarvam API (default: "https://api.sarvam.ai")
     */
    constructor(opts: { apiKey: string, baseUrl?: string }) {
        if (!opts.apiKey) {
            throw new Error("API subscription key is required");
        }
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl || "https://api.sarvam.ai";
    }

    /**
     * Returns the list of supported languages for Text-to-Speech
     * @returns Array of supported language codes
     */
    static getTTSLanguages(): SarvamTypes.LanguageCode[] {
        return [
            "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN",
            "od-IN", "pa-IN", "ta-IN", "te-IN", "en-IN", "gu-IN"
        ];
    }

    /**
     * Returns the list of supported models for Text-to-Speech
     * @returns Array of supported TTS model names
     */
    static getTTSModels(): string[] {
        return ["bulbul:v1"];
    }

    /**
     * Returns the list of available speakers for Text-to-Speech
     * @returns Array of available TTS speakers
     */
    static getTTSSpeakers(): SarvamTypes.TTSSpeaker[] {
        return [
            "meera", "pavithra", "maitreyi", "arvind", "amol",
            "amartya", "diya", "neel", "misha", "vian", "arjun", "maya"
        ];
    }

    /**
     * Returns the list of supported languages for Speech-to-Text
     * @returns Array of supported language codes
     */
    static getSTTLanguages(): SarvamTypes.LanguageCode[] {
        return [
            "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN",
            "od-IN", "pa-IN", "ta-IN", "te-IN", "en-IN", "gu-IN"
        ];
    }

    /**
     * Returns the list of supported models for Speech-to-Text
     * @returns Array of supported STT model names
     */
    static getSTTModels(): string[] {
        return ["saarika:v1", "saarika:v2", "saarika:flash"];
    }

    /**
     * Converts text to speech
     * @param params Text-to-Speech request parameters or plain JSON object
     * @returns A promise resolving to the TTS response
     */
    async textToSpeech(params: SarvamTypes.TTSRequest | Record<string, any>): Promise<SarvamTypes.TTSResponse> {
        // Convert to TTSRequest if plain object was passed
        const request = params instanceof SarvamTypes.TTSRequest
            ? params
            : SarvamTypes.TTSRequest.fromJson(params);

        // Validate inputs
        if (!request.inputs || !Array.isArray(request.inputs) || request.inputs.length === 0) {
            throw new Error("At least one input text is required");
        }

        if (request.inputs.length > 3) {
            throw new Error("Maximum 3 input texts are allowed");
        }

        if (request.inputs.some(text => text.length > 500)) {
            throw new Error("Each text should be no longer than 500 characters");
        }

        // Validate pitch if provided
        if (request.pitch !== undefined && request.pitch !== null && (request.pitch < -1 || request.pitch > 1)) {
            throw new Error("Pitch must be between -1 and 1");
        }

        // Validate pace if provided
        if (request.pace !== undefined && request.pace !== null && (request.pace < 0.3 || request.pace > 3)) {
            throw new Error("Pace must be between 0.3 and 3");
        }

        // Validate loudness if provided
        if (request.loudness !== undefined && request.loudness !== null && (request.loudness < 0 || request.loudness > 3)) {
            throw new Error("Loudness must be between 0 and 3");
        }

        try {
            const response = await fetch(`${this.baseUrl}/text-to-speech`, {
                method: "POST",
                headers: {
                    "api-subscription-key": this.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(request instanceof SarvamTypes.TTSRequest ? request.toJson() : request),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`TTS API error (${response.status}): ${errorData ? JSON.stringify(errorData) : response.statusText}`);
            }

            const jsonResponse = await response.json();
            return SarvamTypes.TTSResponse.fromJson(jsonResponse);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to call Text-to-Speech API: ${String(error)}`);
        }
    }

    /**
     * Converts speech to text
     * @param params Speech-to-Text request parameters
     * @returns A promise resolving to the STT response
     */
    async speechToText(params: SarvamTypes.STTRequest): Promise<SarvamTypes.STTResponse> {
        if (!params.file) {
            throw new Error("Audio file is required");
        }

        // Check if file type is supported
        const fileName = (params.file as File).name || "";
        if (fileName && !fileName.toLowerCase().endsWith(".wav") && !fileName.toLowerCase().endsWith(".mp3")) {
            throw new Error("Only WAV and MP3 formats are supported");
        }

        // If saarika:v1 is specified, language_code is required
        if (params.model === "saarika:v1" && (!params.language_code || params.language_code === "unknown")) {
            throw new Error("language_code is required when using saarika:v1 model");
        }

        try {
            // Use the toFormData method to create FormData
            const formData = params.toFormData();

            const response = await fetch(`${this.baseUrl}/speech-to-text`, {
                method: "POST",
                headers: {
                    "api-subscription-key": this.apiKey,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`STT API error (${response.status}): ${errorData ? JSON.stringify(errorData) : response.statusText}`);
            }

            const jsonResponse = await response.json();
            return SarvamTypes.STTResponse.fromJson(jsonResponse);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to call Speech-to-Text API: ${String(error)}`);
        }
    }

    /**
     * Helper method to convert a base64 audio string to an audio element
     * @param base64Audio Base64-encoded audio string (from TTS response)
     * @returns An HTMLAudioElement that can be played or added to the document
     */
    createAudioFromBase64(base64Audio: string): HTMLAudioElement {
        const audio = new Audio();
        audio.src = `data:audio/wav;base64,${base64Audio}`;
        return audio;
    }

    /**
     * Returns the supported sample rates for Text-to-Speech
     * @returns Array of supported sample rates
     */
    getTTSSampleRates(): SarvamTypes.TTSSampleRate[] {
        return [8000, 16000, 22050];
    }
}