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

    append(message: llm.ChatMessage): CustomChatContext {
        const msg = message instanceof llm.ChatMessage
            ? message
            : new llm.ChatMessage(message);
        this.messages.push(msg);
        return this;
    }

}