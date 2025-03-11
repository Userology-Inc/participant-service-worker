import { pipeline } from "@livekit/agents";
import { LLMStream } from "../llm/portkey.js";
import { SpeechHandle } from "@livekit/agents/dist/pipeline/speech_handle.js";
export class CustomAgent extends pipeline.VoicePipelineAgent {
    #playingSpeech: SpeechHandle | undefined;

    // Override the interrupt method
    interrupt(): boolean {
        console.log("CustomAgent: interrupt called");
        if (
            !this.#playingSpeech ||
            !this.#playingSpeech.allowInterruptions ||
            this.#playingSpeech.interrupted
        ) {
            return false;
        }

        this.#playingSpeech.interrupt();
        return true;
    }

    // Custom implementation of linkParticipant
}
// import { pipeline } from "@livekit/agents";
// import { LLMStream } from "../llm/portkey.js";
// // import { Room, RemoteParticipant, RoomEvent, TrackPublishOptions, TrackSource, LocalAudioTrack } from "livekit-client";
// // import { HumanInput, HumanInputEvent } from "@livekit/agents/dist/pipeline/human_input";
// // import { VPAEvent } from "@livekit/agents";
// import { randomUUID } from "crypto";
// import { RemoteParticipant, Room, RoomEvent } from "@livekit/rtc-node";

// export class CustomAgent extends pipeline.VoicePipelineAgent {
//     #playingSpeech: any | undefined;
//     #customParticipant: RemoteParticipant | null = null;
//     #customHumanInput: HumanInput | undefined;
//     #customTranscriptionId: string | undefined;
//     #customTranscribedInterimText: string = '';

//     // Override the interrupt method
//     interrupt(): boolean {
//         console.log("CustomAgent: interrupt called");
//         if (
//             !this.#playingSpeech ||
//             !this.#playingSpeech.allowInterruptions ||
//             this.#playingSpeech.interrupted
//         ) {
//             return false;
//         }

//         this.#playingSpeech.interrupt();
//         return true;
//     }

//     // Custom implementation of linkParticipant
//     customLinkParticipant(participantIdentity: string): void {
//         console.log(`CustomAgent: linking participant ${participantIdentity}`);

//         // Access the room through the parent's getter
//         const room = this.room;
//         if (!room) {
//             console.error('Room is not set');
//             return;
//         }

//         this.#customParticipant = room.remoteParticipants.get(participantIdentity) || null;
//         if (!this.#customParticipant) {
//             console.error(`Participant with identity ${participantIdentity} not found`);
//             return;
//         }

//         // Create a new HumanInput instance
//         this.#customHumanInput = new HumanInput(room, this.vad, this.stt, this.#customParticipant);

//         // Set up event listeners
//         this.#customHumanInput.on(HumanInputEvent.START_OF_SPEECH, (event) => {
//             console.log("CustomAgent: User started speaking");
//             this.emit(VPAEvent.USER_STARTED_SPEAKING);
//             // Custom handling for start of speech
//         });

//         this.#customHumanInput.on(HumanInputEvent.VAD_INFERENCE_DONE, (event) => {
//             // Custom handling for VAD inference
//             console.log("CustomAgent: VAD inference done", event.probability);

//             // Add your custom logic here
//         });

//         this.#customHumanInput.on(HumanInputEvent.END_OF_SPEECH, (event) => {
//             console.log("CustomAgent: User stopped speaking");
//             this.emit(VPAEvent.USER_STOPPED_SPEAKING);
//             // Custom handling for end of speech
//         });

//         this.#customHumanInput.on(HumanInputEvent.INTERIM_TRANSCRIPT, (event) => {
//             console.log("CustomAgent: Interim transcript", event.alternatives![0].text);

//             if (!this.#customTranscriptionId) {
//                 this.#customTranscriptionId = randomUUID();
//             }
//             this.#customTranscribedInterimText = event.alternatives![0].text;

//             // Publish transcription with custom handling
//             room.localParticipant!.publishTranscription({
//                 participantIdentity: this.#customHumanInput!.participant.identity,
//                 trackSid: this.#customHumanInput!.subscribedTrack!.sid!,
//                 segments: [
//                     {
//                         text: this.#customTranscribedInterimText,
//                         id: this.#customTranscriptionId,
//                         final: true,
//                         startTime: BigInt(0),
//                         endTime: BigInt(0),
//                         language: '',
//                     },
//                 ],
//             });
//         });

//         this.#customHumanInput.on(HumanInputEvent.FINAL_TRANSCRIPT, (event) => {
//             const newTranscript = event.alternatives![0].text;
//             if (!newTranscript) return;

//             console.log("CustomAgent: Final transcript", newTranscript);

//             if (!this.#customTranscriptionId) {
//                 this.#customTranscriptionId = randomUUID();
//             }

//             // Update transcribed text
//             this.transcribedText += (this.transcribedText ? ' ' : '') + newTranscript;

//             // Publish final transcription
//             room.localParticipant!.publishTranscription({
//                 participantIdentity: this.#customHumanInput!.participant.identity,
//                 trackSid: this.#customHumanInput!.subscribedTrack!.sid!,
//                 segments: [
//                     {
//                         text: this.transcribedText,
//                         id: this.#customTranscriptionId,
//                         final: true,
//                         startTime: BigInt(0),
//                         endTime: BigInt(0),
//                         language: '',
//                     },
//                 ],
//             });
//             this.#customTranscriptionId = undefined;

//             // Add your custom logic for handling final transcript
//             // For example, custom interruption logic
//             this.interrupt();
//         });
//     }

//     // Override the start method to use our custom linkParticipant
//     start(room: Room, participant: RemoteParticipant | string | null = null) {
//         console.log("CustomAgent: start called");

//         // Set up room event listener
//         room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
//             // Automatically link to the first participant that connects, if not already linked
//             if (this.#customParticipant) {
//                 return;
//             }
//             this.customLinkParticipant(participant.identity!);
//         });

//         // Handle participant linking
//         if (participant) {
//             if (typeof participant === 'string') {
//                 this.customLinkParticipant(participant);
//             } else {
//                 this.customLinkParticipant(participant.identity!);
//             }
//         }

//         // Call the parent's start method to handle the rest of the initialization
//         // This will call the parent's #run method
//         super.start(room, participant);
//     }

//     // Add getters to access parent's private properties
//     get room(): Room | undefined {
//         return (this as any).#room;
//     }

//     get vad() {
//         return (this as any).#vad;
//     }

//     get stt() {
//         return (this as any).#stt;
//     }
// }
