// SPDX-License-Identifier: Apache-2.0
import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  pipeline,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import CustomChatContext from './agent/CustomChatContext.js';
import * as portkey from './plugins/portkey/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {

    await ctx.connect();
    console.log('waiting for participant');
    const participant = await ctx.waitForParticipant();
    console.log(`starting assistant example agent for ${participant.identity}`);

    const vad = ctx.proc.userData.vad! as silero.VAD;
    const stt = new deepgram.STT();
    const tts = new elevenlabs.TTS();
    const customLLM = new portkey.LLM(
      {
        apiKey: process.env.PORTKEY_API_KEY!,
        configId: `pc-modera-fc0ed1`,
        metadata: JSON.parse(ctx.room?.metadata ?? `{}`) ?? {},
      }
    );
    // const customLLM = new openai.LLM();
    const initialContext = new CustomChatContext().append({
      role: llm.ChatRole.SYSTEM,
      text:
        'You are a voice assistant created by LiveKit. Your interface with users will be voice. ' +
        'You should use short and concise responses, and avoiding usage of unpronounceable ' +
        'punctuation.',
    });
    console.log(ctx.room.metadata);
    const fncCtx: llm.FunctionContext = {
      weather: {
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          console.debug(`executing weather function for ${location}`);
          const response = await fetch(`https://wttr.in/${location}?format=%C+%t`);
          if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
          }
          const weather = await response.text();
          return `The weather in ${location} right now is ${weather}.`;
        },
      },
    };

    const vpaOptions: Partial<pipeline.VPAOptions> = {
      chatCtx: initialContext,
    }

    const agent = new pipeline.VoicePipelineAgent(
      vad,
      stt,
      customLLM,
      tts,
      vpaOptions
    );
    agent.start(ctx.room, participant);

    await agent.say('Hey, how can I help you today', true);
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));