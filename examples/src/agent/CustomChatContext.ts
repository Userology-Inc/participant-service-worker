import { llm } from '@livekit/agents';

export default class CustomChatContext extends llm.ChatContext {
    messages: llm.ChatMessage[] = [];
    metadata: { [id: string]: any } = {};

    updateMessage(
        predicate: number | ((msg: llm.ChatMessage) => boolean),
        newData: llm.ChatMessage
    ): boolean {
        const index =
            typeof predicate === 'number'
                ? predicate
                : this.messages.findIndex(predicate);
        if (index === -1) {
            return false;
        }
        this.messages[index] = new llm.ChatMessage(newData);
        return true;
    }

    getMessageById(id: string): llm.ChatMessage | undefined {
        return this.messages.find((msg) => msg.id === id);
    }

    getMessagesByRole(role: llm.ChatRole): llm.ChatMessage[] {
        return this.messages.filter((msg) => msg.role === role);
    }

    getAllMessages(): llm.ChatMessage[] {
        return [...this.messages];
    }

    clearMessages(): void {
        this.messages = [];
    }

    copy(): CustomChatContext {
        const ctx = new CustomChatContext();
        ctx.messages = this.messages.map((msg) => msg.copy());
        ctx.metadata = structuredClone(this.metadata);
        return ctx;
    }
}