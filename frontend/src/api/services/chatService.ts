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
    
    // Prepare the request body
    const requestBody = JSON.stringify({
        messages: messages,
        model: model
    });
    
    // Get the API base URL and construct the full URL
    const baseURL = apiClient.defaults.baseURL || '';
    const url = `${baseURL}/api/v1/chat/wine/stream`;
    
    // Prepare headers
    const headers: { [key: string]: any } = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream' // Important for SSE
    };
    
    // Add authorization header if it exists
    if (apiClient.defaults.headers.common?.['Authorization']) {
        // react-native-sse needs headers in a specific format
        headers['Authorization'] = {
             toString: function () {
                return apiClient.defaults.headers.common['Authorization'] as string;
            }
        };
    }

    console.log(`[chatService] Creating EventSource for URL: ${url}`);
    console.log(`[chatService] With headers: ${JSON.stringify(Object.keys(headers))}`); // Log header keys only

    // Define the custom event types expected from the backend
    type BackendEvent = 'start' | 'content' | 'followup' | 'error' | 'end';

    // Create the EventSource instance
    const es = new EventSource<BackendEvent>(url, {
        method: 'POST',
        headers: headers,
        body: requestBody,
        debug: true // Enable library debugging output
    });

    // Listener for connection opening
    es.addEventListener('open', (event) => {
        console.log("[chatService] Stream connection opened", event);
        callbacks.onStart?.();
    });

    // Listener for connection errors
    es.addEventListener('error', (event: any) => {
        console.error("[chatService] EventSource connection error object:", event);
        // Attempt to extract a meaningful message
        let errorMessage = 'Stream connection failed';
        if (event && typeof event === 'object') {
            if ('message' in event && typeof event.message === 'string') {
                errorMessage = event.message;
            } else if ('type' in event && typeof event.type === 'string') {
                // Fallback to event type if message is missing
                errorMessage = `Stream error event: ${event.type}`;
            } 
        }
         // Log the raw event if it's not an object or has no useful info
        if (errorMessage === 'Stream connection failed') {
             console.error("Could not extract specific error message from event:", event);
        }

        callbacks.onError?.(errorMessage);
        // Close the connection on error
        es.close();
    });

    // Listener specifically for our backend's custom events
    // The library maps the SSE 'event:' field to the 'type' property here
    const customEventListener: EventSourceListener<BackendEvent> = (event: any) => {
        // Basic check for event and type
        if (!event || typeof event !== 'object' || !('type' in event) || typeof event.type !== 'string') {
            console.warn("[chatService] Received malformed event:", event);
            return;
        }
        
        // Explicitly cast to access potential data field after checking type
        const eventWithType = event as { type: BackendEvent; data?: string | null };

        console.log(`[chatService] Received custom event: type=${eventWithType.type}`);

        // We expect data for most custom events
        const rawData = eventWithType.data; // Access data safely now

        try {
             switch (eventWithType.type) {
                case 'start':
                    console.log("[chatService] Backend signaled start.", rawData ? JSON.parse(rawData) : '(no data)');
                    break;
                case 'content':
                    if (rawData) {
                        const contentData = JSON.parse(rawData);
                        if (contentData.text) {
                            callbacks.onContent(contentData.text);
                        }
                    } else {
                         console.warn("[chatService] Received 'content' event with no data.");
                    }
                    break;
                case 'followup':
                     if (rawData) {
                        const followupData = JSON.parse(rawData);
                        if (followupData.questions && Array.isArray(followupData.questions)) {
                            callbacks.onFollowup?.(followupData.questions);
                        }
                    } else {
                         console.warn("[chatService] Received 'followup' event with no data.");
                    }
                    break;
                case 'error': // Custom error *from the backend*
                     if (rawData) {
                        const errorData = JSON.parse(rawData);
                        console.error("[chatService] Received custom backend error:", errorData);
                        callbacks.onError?.(errorData.error || 'Unknown backend error');
                    } else {
                         console.warn("[chatService] Received backend 'error' event with no data.");
                         callbacks.onError?.('Backend signaled an error without details.');
                    }
                    break;
                case 'end':
                    console.log("[chatService] Backend signaled end.", rawData ? JSON.parse(rawData) : '(no data)');
                    callbacks.onEnd?.();
                    es.close(); 
                    break;
            }
        } catch (e) {
             console.error(`[chatService] Error parsing JSON for event '${eventWithType.type}':`, e, "Raw data:", rawData);
             callbacks.onError?.(`Failed to parse data for ${eventWithType.type} event`);
        }
    };

    // Add listeners for *our specific backend events*
    es.addEventListener('start', customEventListener);
    es.addEventListener('content', customEventListener);
    es.addEventListener('followup', customEventListener);
    es.addEventListener('error', customEventListener); // Listen for the backend's custom error event
    es.addEventListener('end', customEventListener);

    // --- We are NOT listening to the generic 'message' event anymore --- 
    // es.addEventListener('message', listener); 

    // Return a function to close the connection
    return () => {
        console.log("[chatService] Closing EventSource connection.");
        es.removeAllEventListeners(); // Clean up listeners
        es.close();
    };
}; 