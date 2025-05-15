import { useState, useEffect, useCallback, useRef } from 'react';
import { UIMessage } from '../components/wine/WineChatView';
import { cacheService, CachePrefix } from '../api/services/cacheService';
import { Message, Wine } from '../api/generated/types.gen';
import { streamChatMessage } from '../api/services/chatService';

const DEFAULT_MODEL = "gemini-2.5-flash-preview-04-17";

interface ChatApiResponse {
    response: {
        text: string;
    };
    followup_questions?: string[];
}

interface UseWineChatProps {
    wineId: string | null;
    wine: Wine | null; // Pass the wine object for context
}

interface UseWineChatResult {
    chatMessages: UIMessage[];
    chatInput: string;
    setChatInput: (text: string) => void;
    isChatLoading: boolean;
    followUpQuestions: string[];
    handleSendMessage: (text?: string) => void;
    handleFollowupQuestion: (question: string) => void;
    isInitialized: boolean;
}

export const useWineChat = ({ wineId, wine }: UseWineChatProps): UseWineChatResult => {
    const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const isMounted = useRef(true);
    // Reference to keep track of the current stream abort function
    const abortStreamRef = useRef<(() => void) | null>(null);
    // Reference to track if a streaming response is in progress
    const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);

    // Effect for mount/unmount tracking
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Clean up any active streams
            if (abortStreamRef.current) {
                abortStreamRef.current();
                abortStreamRef.current = null;
            }
        };
    }, []);

    const getFormattedWineName = useCallback(() => {
        if (!wine) return '';
        if (wine.vintage && wine.vintage !== 1 && wine.name) {
            return `${wine.vintage} ${wine.name}`;
        }
        return wine.name || '';
    }, [wine]);

    // Function to save chat messages to cache
    const saveChatToCache = useCallback((messages: UIMessage[]) => {
        if (!wineId) return;
        const chatKey = cacheService.generateKey(CachePrefix.CHAT_MESSAGES, wineId);
        cacheService.set<UIMessage[]>(chatKey, messages);
        console.log(`[useWineChat] Saved ${messages.length} chat messages to cache for ${wineId}`);
    }, [wineId]);

    // Effect to load chat history from cache or initialize
    useEffect(() => {
        if (wine && wineId) {
            const chatKey = cacheService.generateKey(CachePrefix.CHAT_MESSAGES, wineId);
            const cachedMessages = cacheService.get<UIMessage[]>(chatKey);

            if (cachedMessages && cachedMessages.length > 0) {
                console.log(`[useWineChat] Loaded ${cachedMessages.length} messages from cache for ${wineId}`);
                setChatMessages(cachedMessages);
                const lastMessage = cachedMessages[cachedMessages.length - 1];
                if (lastMessage?.role === 'assistant' && lastMessage.followup_questions) {
                    setFollowUpQuestions(lastMessage.followup_questions);
                } else {
                    setFollowUpQuestions([]);
                }
            } else {
                console.log(`[useWineChat] No cache found for ${wineId}, initializing chat.`);
                let aboutText = wine.description ? `${wine.description}\n\n` : '';
                if (wine.food_pairings) aboutText += `**Food Pairing:** ${wine.food_pairings}\n`;
                if (wine.drinking_window) aboutText += `**Drinking Window:** ${wine.drinking_window}\n`;
                if (wine.abv) aboutText += `**ABV:** ${wine.abv}\n`;
                if (!aboutText.trim()) aboutText = `Hello! I'm your wine assistant for the ${getFormattedWineName()}.
`;

                const initialMessageContent = `${aboutText.trim()}`;
                const initialFollowUps = [
                    "What food pairs well?",
                    "Tell me about the winery",
                    "What is the drinking window?"
                ];
                const initialAssistantMessage: UIMessage = {
                    id: '0', // Static ID for initial message
                    content: initialMessageContent,
                    role: 'assistant',
                    timestamp: new Date(),
                    followup_questions: initialFollowUps,
                };
                setChatMessages([initialAssistantMessage]);
                setFollowUpQuestions(initialFollowUps);
                saveChatToCache([initialAssistantMessage]);
            }
            setIsInitialized(true); // Mark as initialized after loading/setting initial
        } else {
            // Clear messages if wine/wineId is not available
            setChatMessages([]);
            setFollowUpQuestions([]);
            setIsInitialized(false);
        }
    }, [wine, wineId, getFormattedWineName, saveChatToCache]); // Dependencies

    const handleSendMessage = useCallback(async (text: string = chatInput) => {
        if (!text.trim() || !wine || !wineId) return;

        // Abort any active stream before starting a new one
        if (abortStreamRef.current) {
            abortStreamRef.current();
            abortStreamRef.current = null;
            setCurrentStreamingMessageId(null);
        }

        const userMessage: UIMessage = {
            id: Date.now().toString(),
            content: text.trim(),
            role: 'user',
            timestamp: new Date(),
        };

        const updatedMessagesUser = [...chatMessages, userMessage];
        setChatMessages(updatedMessagesUser);
        saveChatToCache(updatedMessagesUser);

        setChatInput('');
        setIsChatLoading(true);
        setFollowUpQuestions([]);

        try {
            const wineContext = `The user is asking about ${getFormattedWineName()}. Context: Region: ${wine.region || 'N/A'}, Country: ${wine.country || 'N/A'}, Varietal: ${wine.varietal || 'N/A'}, Winery: ${wine.winery || 'N/A'}, Description: ${wine.description || 'N/A'}`;
            let apiMessages: Message[] = [
                { role: 'user', content: { text: wineContext } }
            ];
            const history = updatedMessagesUser
                .filter(msg => msg.id !== '0')
                .map(msg => ({ role: msg.role, content: { text: msg.content } } as Message));
            apiMessages = [...apiMessages, ...history];

            console.log("[useWineChat] Sending messages to API:", JSON.stringify(apiMessages, null, 2));

            // Create a placeholder message for the assistant's response that will be streamed
            const assistantMessageId = Date.now().toString() + '-assistant';
            const initialAssistantMessage: UIMessage = {
                id: assistantMessageId,
                content: '', // Empty initially, will be populated as content streams in
                role: 'assistant',
                timestamp: new Date(),
            };

            // Add the initial empty assistant message
            const updatedMessagesWithAssistant = [...updatedMessagesUser, initialAssistantMessage];
            setChatMessages(updatedMessagesWithAssistant);
            // Set the current streaming message ID
            setCurrentStreamingMessageId(assistantMessageId);

            // Use the streaming API
            abortStreamRef.current = streamChatMessage(
                apiMessages, 
                DEFAULT_MODEL,
                {
                    onStart: () => {
                        console.log("[useWineChat] Stream started");
                    },
                    onContent: (content) => {
                        if (!isMounted.current) return;
                        
                        // Update the assistant's message content as new tokens arrive
                        setChatMessages(prev => {
                            const updatedMessages = [...prev];
                            const assistantMessageIndex = updatedMessages.findIndex(
                                msg => msg.id === assistantMessageId
                            );
                            
                            if (assistantMessageIndex !== -1) {
                                // Append the new content to the existing message
                                const currentMessage = updatedMessages[assistantMessageIndex];
                                updatedMessages[assistantMessageIndex] = {
                                    ...currentMessage,
                                    content: currentMessage.content + content
                                };
                                // Save to cache with each update so we don't lose progress if the component unmounts
                                saveChatToCache(updatedMessages);
                            }
                            
                            return updatedMessages;
                        });
                    },
                    onFollowup: (followupQuestions) => {
                        if (!isMounted.current) return;
                        
                        console.log("[useWineChat] Received followup questions:", followupQuestions);
                        setFollowUpQuestions(followupQuestions);
                        
                        // Update the assistant's message with follow-up questions
                        setChatMessages(prev => {
                            const updatedMessages = [...prev];
                            const assistantMessageIndex = updatedMessages.findIndex(
                                msg => msg.id === assistantMessageId
                            );
                            
                            if (assistantMessageIndex !== -1) {
                                // Add the followup questions to the message
                                updatedMessages[assistantMessageIndex] = {
                                    ...updatedMessages[assistantMessageIndex],
                                    followup_questions: followupQuestions
                                };
                                // Save to cache
                                saveChatToCache(updatedMessages);
                            }
                            
                            return updatedMessages;
                        });
                    },
                    onError: (error) => {
                        if (!isMounted.current) return;
                        
                        console.error('[useWineChat] Stream error reported by chatService:', error);
                        const errorMessageUI: UIMessage = {
                            id: Date.now().toString() + '-error',
                            content: error || 'Sorry, I encountered an error. Please try again.',
                            role: 'assistant',
                            timestamp: new Date(),
                            isError: true,
                        };
                        
                        // Ensure we update with user message + error message if stream fails early
                        setChatMessages(prev => {
                            // Check if the placeholder assistant message is still the last one
                            const lastMessage = prev[prev.length -1];
                            if (lastMessage && lastMessage.id === currentStreamingMessageId && !lastMessage.content && !lastMessage.isError) {
                                return [...prev.slice(0, -1), errorMessageUI]; // Replace empty placeholder
                            }
                            return [...prev, errorMessageUI]; // Append error if placeholder was already filled or removed
                        });
                        // saveChatToCache logic might be needed here if you want to persist this error state in chat history

                        setIsChatLoading(false);
                        setCurrentStreamingMessageId(null);
                        if (abortStreamRef.current) {
                            console.log("[useWineChat] onError: Aborting stream due to error.");
                            abortStreamRef.current(); // Explicitly call the cleanup function
                            abortStreamRef.current = null; // Clear the ref
                        }
                    },
                    onEnd: () => {
                        if (!isMounted.current) return;
                        
                        console.log("[useWineChat] Stream ended");
                        // Final save of potentially completed message in cache is handled here or after followup
                        setChatMessages(prev => {
                            // Call saveChatToCache with the latest messages after stream ends
                            saveChatToCache(prev);
                            return prev;
                        });
                        setIsChatLoading(false);
                        setCurrentStreamingMessageId(null);
                        if (abortStreamRef.current) { // Should already be null if backend sent 'end' and service closed
                            abortStreamRef.current = null; 
                        }
                    }
                }
            );

        } catch (error: any) {
            console.error('[useWineChat] Error setting up stream:', error);
            if (!isMounted.current) return;
            
            const errorMessageContent = error.message || 'Sorry, I encountered an error.';
            const errorMessage: UIMessage = {
                id: Date.now().toString() + '-error',
                content: errorMessageContent,
                role: 'assistant',
                timestamp: new Date(),
                isError: true,
            };

            const updatedMessagesError = [...updatedMessagesUser, errorMessage];
            setChatMessages(updatedMessagesError);
            saveChatToCache(updatedMessagesError);
            setIsChatLoading(false);
            setCurrentStreamingMessageId(null);
        }
    }, [chatInput, chatMessages, wine, wineId, getFormattedWineName, saveChatToCache]);

    const handleFollowupQuestion = useCallback((question: string) => {
        handleSendMessage(question);
    }, [handleSendMessage]);

    return {
        chatMessages,
        chatInput,
        setChatInput,
        isChatLoading,
        followUpQuestions,
        handleSendMessage,
        handleFollowupQuestion,
        isInitialized,
    };
}; 