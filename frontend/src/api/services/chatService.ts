import { apiClient } from '../index'; // Import the configured apiClient
import { Message } from '../generated/types.gen'; // Import relevant types
import EventSource, { EventSourceListener } from 'react-native-sse'; // Import the library

// Define the expected response structure from the backend chat endpoint
interface ChatApiResponse {
    response: {
        text: string;
    };
    followup_questions?: string[];
}

// Streaming API response event handlers
export interface StreamChatCallbacks {
    onStart?: () => void;
    onContent: (content: string) => void;
    onFollowup?: (questions: string[]) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
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

/**
 * Sends chat messages to the streaming backend AI chat endpoint using react-native-sse.
 * @param messages - An array of messages forming the conversation history.
 * @param model - The specific AI model to use.
 * @param callbacks - Object with callback functions for different streaming events.
 * @returns A function to close the EventSource connection.
 */
export const streamChatMessage = (
    messages: Message[],
    model: string,
    callbacks: StreamChatCallbacks
): () => void => {
    
    const requestBody = JSON.stringify({
        messages: messages,
        model: model
    });
    
    const baseURL = apiClient.defaults.baseURL || '';
    const url = `${baseURL}/api/v1/chat/wine/stream`;
    
    const headers: { [key: string]: any } = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    };
    
    // Simplified Authorization header
    const authToken = apiClient.defaults.headers.common?.['Authorization'];
    if (typeof authToken === 'string') {
        headers['Authorization'] = authToken;
    } else if (typeof apiClient.defaults.headers.common?.['Authorization'] === 'object' && apiClient.defaults.headers.common['Authorization'] !== null && typeof (apiClient.defaults.headers.common['Authorization'] as any).toString === 'function') {
        // Fallback for unusual auth token structure, though direct string is preferred
        headers['Authorization'] = {
            toString: function () {
                return apiClient.defaults.headers.common!['Authorization'] as string;
            }
        };
    }
    console.log(`[chatService] Authorization header: ${headers['Authorization']}`);

    console.log(`[chatService] Creating EventSource for URL: ${url}`);
    console.log(`[chatService] With headers: ${JSON.stringify(Object.keys(headers))}`); // Log only keys for brevity, or consider more detailed logging if needed for auth debugging

    type BackendEvent = 'start' | 'content' | 'followup' | 'error' | 'end';

    const es = new EventSource<BackendEvent>(url, {
        method: 'POST',
        headers: headers,
        body: requestBody,
        debug: true, 
        lineEndingCharacter: '\n',
    });

    let accumulatedContent = '';
    let timeoutId: NodeJS.Timeout | null = null;

    const clearIdleTimeout = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const resetIdleTimeout = () => {
        clearIdleTimeout();
        timeoutId = setTimeout(() => {
            console.warn("[chatService] Stream timed out due to 30s inactivity.");
            callbacks.onError?.("Stream timed out after 30 seconds of inactivity.");
            es.close(); // Close the connection
            // Listeners should be removed by the main cleanup function or when es.close() is effective
        }, 30000); // 30 seconds
    };

    es.addEventListener('open', (event) => {
        console.log("[chatService] Stream connection opened", event);
        callbacks.onStart?.();
        accumulatedContent = '';
        resetIdleTimeout(); // Start idle timer
    });

    es.addEventListener('error', (event: any) => {
        console.error("[chatService] EventSource connection error object:", event); // Log the full event
        let errorMessage = 'Stream connection failed';
        if (event && typeof event === 'object') {
            if ('message' in event && typeof event.message === 'string') {
                errorMessage = event.message;
            } else if ('type' in event && typeof event.type === 'string') {
                errorMessage = `Stream error event: ${event.type}`;
            } 
        }
        if (errorMessage === 'Stream connection failed') {
             console.error("[chatService] Could not extract specific error message from EventSource error event:", event);
        }
        callbacks.onError?.(errorMessage);
        clearIdleTimeout(); // Clear timeout on error
        es.close(); // Ensure connection is closed
    });

    const customEventListener: EventSourceListener<BackendEvent> = (event: any) => {
        // Enhanced logging for all received events
        console.log(`[chatService] Raw event received: type=${event?.type}, data=${event?.data}`);

        if (!event || typeof event !== 'object' || !('type' in event) || typeof event.type !== 'string') {
            console.warn("[chatService] Received malformed event:", event);
            return;
        }
        
        resetIdleTimeout(); // Reset idle timer on any valid event from backend

        const eventWithType = event as { type: BackendEvent; data?: string | null };
        const rawData = eventWithType.data;

        try {
             switch (eventWithType.type) {
                case 'start':
                    console.log("[chatService] Backend signaled start.", rawData ? JSON.parse(rawData) : '(no data)');
                    accumulatedContent = '';
                    // onStart callback is handled by 'open' event listener
                    break;
                case 'content':
                    if (rawData) {
                        const contentData = JSON.parse(rawData);
                        if (contentData.text !== undefined && contentData.text !== null) { // Check for undefined or null explicitly
                            callbacks.onContent(contentData.text);
                            accumulatedContent += contentData.text;
                        } else {
                            console.warn("[chatService] Received 'content' event with valid JSON but no 'text' field or text is null/undefined:", contentData);
                        }
                    } else {
                         console.warn("[chatService] Received 'content' event with no data.");
                    }
                    break;
                case 'followup':
                    if (rawData) {
                        const followupData = JSON.parse(rawData);
                        if (followupData.questions && Array.isArray(followupData.questions)) {
                            console.log("[chatService] Received 'followup' event with questions:", followupData.questions);
                            callbacks.onFollowup?.(followupData.questions);
                        } else {
                            console.warn("[chatService] Received 'followup' event with invalid or missing 'questions' field:", followupData);
                        }
                    } else {
                        console.warn("[chatService] Received 'followup' event with no data.");
                    }
                    break;
                case 'error': 
                     if (rawData) {
                        const errorData = JSON.parse(rawData);
                        console.error("[chatService] Received custom backend error event:", errorData);
                        callbacks.onError?.(errorData.error || 'Unknown backend error');
                    } else {
                         console.warn("[chatService] Received backend 'error' event with no data.");
                         callbacks.onError?.('Backend signaled an error without details.');
                    }
                    clearIdleTimeout(); // Clear timeout as this is a terminal server-sent error
                    es.close(); // Close on server-sent error
                    break;
                case 'end':
                    console.log("[chatService] Backend signaled end. Full accumulated content (first 200 chars):", accumulatedContent.substring(0, 200) + "...");
                    
                    // Follow-up questions are now handled by the 'followup' event.
                    // The onContent callback should have progressively built the UI with the main content.

                    callbacks.onEnd?.();
                    clearIdleTimeout(); // Clear timeout as stream ended successfully
                    es.close(); // Close connection
                    break;
                default:
                    console.warn(`[chatService] Received event with unknown type: ${eventWithType.type}`);
            }
        } catch (e: any) { // Added type for error object
             console.error(`[chatService] Error parsing JSON or processing event '${eventWithType.type}':`, e.message, "Raw data:", rawData, "Stack:", e.stack);
             callbacks.onError?.(`Failed to process event ${eventWithType.type}: ${e.message}`);
             clearIdleTimeout(); // Clear timeout on processing error
             es.close(); // Close connection on parsing/processing error
        }
    };

    es.addEventListener('start', customEventListener);
    es.addEventListener('content', customEventListener);
    es.addEventListener('followup', customEventListener);
    es.addEventListener('error', customEventListener);
    es.addEventListener('end', customEventListener);

    return () => {
        console.log("[chatService] Cleaning up EventSource connection.");
        clearIdleTimeout(); // Ensure timeout is cleared on cleanup
        es.removeAllEventListeners(); 
        es.close();
    };
}; 