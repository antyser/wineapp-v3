import { apiClient } from '../index'; // Import the configured apiClient
import { Message } from '../generated/types.gen'; // Import relevant types

// Define the expected response structure from the backend chat endpoint
interface ChatApiResponse {
    response: {
        text: string;
    };
    followup_questions?: string[];
}

/** 
 * Sends chat messages to the backend AI chat endpoint.
 * @param messages - An array of messages forming the conversation history.
 * @param model - The specific AI model to use.
 * @returns A promise resolving to the API response containing the assistant's reply and follow-up questions.
 */
export const sendChatMessage = async (
    messages: Message[], 
    model: string
): Promise<ChatApiResponse> => {
    try {
        const response = await apiClient.post<ChatApiResponse>('/api/v1/chat/wine', {
            messages: messages,
            model: model
        });
        return response.data; // Return the structured response
    } catch (error) {
        console.error('[chatService] Error sending chat message:', error);
        // Re-throw or handle error as appropriate
        throw error;
    }
}; 