import { useState, useEffect, useCallback, useRef } from 'react';
import { UIMessage } from '../components/wine/WineChatView';
import { cacheService, CachePrefix } from '../api/services/cacheService';
import { apiClient } from '../api';
import { Message, Wine } from '../api/generated/types.gen';

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

    // Effect for mount/unmount tracking
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
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
                    "What food would pair well with this wine?",
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
                { role: 'system', content: { text: wineContext } } // Use system role for context
            ];
            const history = updatedMessagesUser
                .filter(msg => msg.id !== '0')
                .map(msg => ({ role: msg.role, content: { text: msg.content } } as Message));
            apiMessages = [...apiMessages, ...history];

            console.log("[useWineChat] Sending messages to API:", JSON.stringify(apiMessages, null, 2));

            const response = await apiClient.post<ChatApiResponse>('/api/v1/chat/wine', {
                messages: apiMessages,
                model: DEFAULT_MODEL
            });

            const chatApiResponse = response.data;
            console.log("[useWineChat] Full API response:", chatApiResponse);

            if (chatApiResponse?.response?.text) {
                const responseText = chatApiResponse.response.text;
                const followup_questions = chatApiResponse.followup_questions || [];
                const assistantMessage: UIMessage = {
                    id: Date.now().toString() + '-assistant',
                    content: responseText,
                    role: 'assistant',
                    timestamp: new Date(),
                    followup_questions: followup_questions.length > 0 ? followup_questions : undefined
                };

                if (!isMounted.current) return;
                const updatedMessagesAssistant = [...updatedMessagesUser, assistantMessage];
                setChatMessages(updatedMessagesAssistant);
                saveChatToCache(updatedMessagesAssistant);
                setFollowUpQuestions(followup_questions);

            } else {
                console.error("[useWineChat] Invalid or empty response from API:", chatApiResponse);
                throw new Error('Received an invalid response from the assistant.');
            }

        } catch (error: any) {
            console.error('[useWineChat] Error sending message:', error);
            const errorMessageContent = error.response?.data?.detail || error.message || 'Sorry, I encountered an error.';
            const errorMessage: UIMessage = {
                id: Date.now().toString() + '-error',
                content: errorMessageContent,
                role: 'assistant',
                timestamp: new Date(),
                isError: true,
            };

            if (!isMounted.current) return;
            const updatedMessagesError = [...updatedMessagesUser, errorMessage];
            setChatMessages(updatedMessagesError);
            saveChatToCache(updatedMessagesError);

        } finally {
             if (isMounted.current) {
                setIsChatLoading(false);
             }
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