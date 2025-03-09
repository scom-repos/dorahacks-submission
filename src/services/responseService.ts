import { createCompletion } from "./completionService";

// Use a simpler type definition that works with the actual API response
type CompletionResult = string | AsyncIterable<any>;

export const generateResponse = async (
    systemPrompt: string,
    history: { role: "user" | "ai"; message: string }[],
    userMessage: string,
    streaming: boolean = false
): Promise<CompletionResult> => {
    try {
        // Ensure `role` conforms to OpenAI's expectations
        const messages = [{ role: "system", content: systemPrompt }];

        history.forEach((chat) => {
            if (chat.role === "user" && chat.message) {
                messages.push({ role: "user", content: chat.message });
            } else if (chat.role === "ai" && chat.message) {
                messages.push({ role: "assistant", content: chat.message });
            }
        });

        if (userMessage) {
            messages.push({ role: "user", content: userMessage });
        }

        const response = await createCompletion(messages, streaming);

        return response;
    } catch (error) {
        console.error("Error generating response:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};