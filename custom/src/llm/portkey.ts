// import { llm, log } from '@livekit/agents';
// import { randomUUID } from 'node:crypto';
// import { ApiClientInterface } from 'portkey-ai/dist/src/_types/generalTypes.js';
// import sharp from 'sharp';

// import { Portkey } from 'portkey-ai';
// import { ChatCompletionsBodyStreaming } from 'portkey-ai/dist/src/apis/chatCompletions.js';

// export interface CustomLLMOptions extends ApiClientInterface { }

// export class CustomLLM extends llm.LLM {
//     #opts: CustomLLMOptions;
//     #client: Portkey;

//     constructor(opts: Partial<CustomLLMOptions>) {
//         super();

//         this.#opts = { ...opts };
//         if (this.#opts.apiKey === undefined) {
//             throw new Error('Portkey API key is required, whether as an argument or as $PORTKEY_API_KEY');
//         }
//         if (this.#opts.metadata === undefined) {
//             console.warn('metadata is not set, setting to empty object');
//             this.#opts.metadata = {};
//         }
//         console.log(`Setting up Portkey with API key: ${JSON.stringify(this.#opts)}`);
//         this.#client =
//             this.#opts.client ||
//             new Portkey(opts);
//     }


//     chat({
//         chatCtx,
//         fncCtx,
//         temperature,
//         n,
//         parallelToolCalls,
//     }: {
//         chatCtx: llm.ChatContext;
//         fncCtx?: llm.FunctionContext | undefined;
//         temperature?: number | undefined;
//         n?: number | undefined;
//         parallelToolCalls?: boolean | undefined;
//     }): LLMStream {
//         temperature = temperature || this.#opts.temperature;
//         // console.warn(`Calling chat with chatCtx: ${JSON.stringify(chatCtx)}, fncCtx: ${JSON.stringify(fncCtx)}, temperature: ${temperature}, n: ${n}, parallelToolCalls: ${parallelToolCalls}`);

//         return new LLMStream(
//             this,
//             this.#client,
//             chatCtx,
//             fncCtx,
//             this.#opts,
//             parallelToolCalls,
//             temperature,
//             n,
//         );
//     }
// }

// export class LLMStream extends llm.LLMStream {
//     #toolCallId?: string;
//     #fncName?: string;
//     #fncRawArguments?: string;
//     #client: Portkey;
//     #logger = log();
//     #id = randomUUID();
//     label = 'openai.LLMStream';

//     constructor(
//         llm: llm.LLM,
//         client: Portkey,
//         chatCtx: llm.ChatContext,
//         fncCtx: llm.FunctionContext | undefined,
//         opts: CustomLLMOptions,
//         parallelToolCalls?: boolean,
//         temperature?: number,
//         n?: number,
//     ) {
//         super(llm, chatCtx, fncCtx);
//         this.#client = client;
//         this.#run(opts, n, parallelToolCalls, temperature);
//     }

//     async #run(opts: CustomLLMOptions, n?: number, parallelToolCalls?: boolean, temperature?: number) {
//         const tools = this.fncCtx
//             ? Object.entries(this.fncCtx).map(([name, func]) => ({
//                 type: 'function' as const,
//                 function: {
//                     name,
//                     description: func.description,
//                     // don't format parameters if they are raw openai params
//                     parameters:
//                         func.parameters.type == ('object' as const)
//                             ? func.parameters
//                             : llm.oaiParams(func.parameters),
//                 },
//             }))
//             : undefined;

//         try {
//             const messages = await Promise.all(
//                 this.chatCtx.messages.map(async (m) => await buildMessage(m, this.#id)),
//             );
//             const body: ChatCompletionsBodyStreaming = {
//                 messages: messages as any,
//                 temperature: temperature || opts.temperature,
//                 stream_options: { include_usage: true },
//                 stream: true,
//                 tools,
//                 parallel_tool_calls: this.fncCtx && parallelToolCalls,
//             }
//             const params: ApiClientInterface = {
//                 config: opts?.config,
//                 metadata: opts?.metadata ?? {},
//             }
//             // console.log(`Creating stream with body: ${JSON.stringify(body)} and params: ${JSON.stringify(params)}`);
//             const stream: any = await this.#client.chat.completions.create(body, params);
//             // console.log(`Recieved stream: ${JSON.stringify(stream)}`);
//             for await (const chunk of stream) {
//                 for (const choice of chunk.choices) {
//                     // console.log(`Processing choice: ${JSON.stringify(choice)}`);
//                     const chatChunk = this.#parseChoice(chunk.id, choice);
//                     if (chatChunk) {
//                         this.queue.put(chatChunk);
//                     }

//                     if (chunk.usage) {
//                         const usage = chunk.usage;
//                         this.queue.put({
//                             requestId: chunk.id,
//                             choices: [],
//                             usage: {
//                                 completionTokens: usage.completion_tokens as number,
//                                 promptTokens: usage.prompt_tokens as number,
//                                 totalTokens: usage.total_tokens as number,
//                             },
//                         });
//                     }
//                 }
//             }
//         } finally {
//             this.queue.close();
//         }
//     }

//     #parseChoice(id: string, choice: any): llm.ChatChunk | undefined {
//         const delta = choice.delta;

//         if (delta.tool_calls) {
//             // check if we have functions to calls
//             for (const tool of delta.tool_calls) {
//                 if (!tool.function) {
//                     continue; // oai may add other tools in the future
//                 }

//                 let callChunk: llm.ChatChunk | undefined;
//                 if (this.#toolCallId && tool.id && tool.id !== this.#toolCallId) {
//                     callChunk = this.#tryBuildFunction(id, choice);
//                 }

//                 if (tool.function.name) {
//                     this.#toolCallId = tool.id;
//                     this.#fncName = tool.function.name;
//                     this.#fncRawArguments = tool.function.arguments || '';
//                 } else if (tool.function.arguments) {
//                     this.#fncRawArguments += tool.function.arguments;
//                 }

//                 if (callChunk) {
//                     return callChunk;
//                 }
//             }
//         }

//         if (
//             choice.finish_reason &&
//             ['tool_calls', 'stop'].includes(choice.finish_reason) &&
//             this.#toolCallId
//         ) {
//             // we're done with the tool calls, run the last one
//             return this.#tryBuildFunction(id, choice);
//         }

//         return {
//             requestId: id,
//             choices: [
//                 {
//                     delta: { content: delta.content || undefined, role: llm.ChatRole.ASSISTANT },
//                     index: choice.index,
//                 },
//             ],
//         };
//     }

//     #tryBuildFunction(
//         id: string,
//         choice: any
//     ): llm.ChatChunk | undefined {
//         if (!this.fncCtx) {
//             this.#logger.warn('oai stream tried to run function without function context');
//             return undefined;
//         }

//         if (!this.#toolCallId) {
//             this.#logger.warn('oai stream tried to run function but toolCallId is not set');
//             return undefined;
//         }

//         if (!this.#fncRawArguments || !this.#fncName) {
//             this.#logger.warn('oai stream tried to run function but rawArguments or fncName are not set');
//             return undefined;
//         }

//         const functionInfo = llm.oaiBuildFunctionInfo(
//             this.fncCtx,
//             this.#toolCallId,
//             this.#fncName,
//             this.#fncRawArguments,
//         );
//         this.#toolCallId = this.#fncName = this.#fncRawArguments = undefined;
//         this._functionCalls.push(functionInfo);

//         return {
//             requestId: id,
//             choices: [
//                 {
//                     delta: {
//                         content: choice.delta.content || undefined,
//                         role: llm.ChatRole.ASSISTANT,
//                         toolCalls: this._functionCalls,
//                     },
//                     index: choice.index,
//                 },
//             ],
//         };
//     }
// }

// const buildMessage = async (msg: llm.ChatMessage, cacheKey: any) => {
//     const oaiMsg: Partial<any> = {};

//     switch (msg.role) {
//         case llm.ChatRole.SYSTEM:
//             oaiMsg.role = 'system';
//             break;
//         case llm.ChatRole.USER:
//             oaiMsg.role = 'user';
//             break;
//         case llm.ChatRole.ASSISTANT:
//             oaiMsg.role = 'assistant';
//             break;
//         case llm.ChatRole.TOOL:
//             oaiMsg.role = 'tool';
//             if (oaiMsg.role === 'tool') {
//                 oaiMsg.tool_call_id = msg.toolCallId;
//             }
//             break;
//     }

//     if (typeof msg.content === 'string') {
//         oaiMsg.content = msg.content;
//     } else if (Array.isArray(msg.content)) {
//         oaiMsg.content = (await Promise.all(
//             msg.content.map(async (c) => {
//                 if (typeof c === 'string') {
//                     return { type: 'text', text: c };
//                 } else if (
//                     // typescript type guard for determining ChatAudio vs ChatImage
//                     ((c: llm.ChatAudio | llm.ChatImage): c is llm.ChatImage => {
//                         return (c as llm.ChatImage).image !== undefined;
//                     })(c)
//                 ) {
//                     return await buildImageContent(c, cacheKey);
//                 } else {
//                     throw new Error('ChatAudio is not supported');
//                 }
//             }),
//         )) as any;
//     } else if (msg.content === undefined) {
//         oaiMsg.content = '';
//     }

//     // make sure to provide when function has been called inside the context
//     // (+ raw_arguments)
//     if (msg.toolCalls && oaiMsg.role === 'assistant') {
//         oaiMsg.tool_calls = Object.entries(msg.toolCalls).map(([name, func]) => ({
//             id: func.toolCallId,
//             type: 'function' as const,
//             function: {
//                 name: name,
//                 arguments: func.rawParams,
//             },
//         }));
//     }

//     return oaiMsg
// };

// const buildImageContent = async (image: llm.ChatImage, cacheKey: any) => {
//     if (typeof image.image === 'string') {
//         // image url
//         return {
//             type: 'image_url',
//             image_url: {
//                 url: image.image,
//                 detail: 'auto',
//             },
//         };
//     } else {
//         if (!image.cache[cacheKey]) {
//             // inside our internal implementation, we allow to put extra metadata to
//             // each ChatImage (avoid to reencode each time we do a chatcompletion request)
//             let encoded = sharp(image.image.data);

//             if (image.inferenceHeight && image.inferenceHeight) {
//                 encoded = encoded.resize(image.inferenceWidth, image.inferenceHeight);
//             }

//             image.cache[cacheKey] = await encoded
//                 .jpeg()
//                 .toBuffer()
//                 .then((buffer) => buffer.toString('utf-8'));
//         }

//         return {
//             type: 'image_url',
//             image_url: {
//                 url: `data:image/jpeg;base64,${image.cache[cacheKey]}`,
//             },
//         };
//     }
// };
