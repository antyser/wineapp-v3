import { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash'
import * as Crypto from 'expo-crypto';
import { Note, NoteUpsertPayload, Wine } from '../api';
import { upsertNote, deleteNote as deleteNoteService } from '../api/services/notesService';
import { cacheService, CachePrefix } from '../api/services/cacheService';

// Debounce delay in milliseconds
const SAVE_DEBOUNCE_DELAY = 500;

// const ASYNC_STORAGE_NOTE_PREFIX = 'note_'; // Removed

interface LocalNoteData {
    id: string;
    wineId: string;
    noteText: string;
    noteDate: string; // YYYY-MM-DD
    lastModifiedOffline: number; // Renamed for clarity
}

interface UseNoteProps {
    wineId: string;
    initialNoteId?: string;
    initialPassedNote?: Note; // Note data passed via navigation
    onNoteTextCommitted: (updatedNote: Note) => void; // Changed to pass the full Note object
}

interface UseNoteReturn {
    noteId: string | null;
    noteText: string;
    setNoteText: (text: string) => void;
    noteDate: string;
    setNoteDate: (date: string) => void; // Will also trigger debounced save
    isLoading: boolean;
    // isSaving: boolean; // Removed
    // syncStatus: LocalNoteData['syncStatus']; // Removed
    error: string | null; // For critical errors
    saveNote: () => Promise<void>; // Manual save trigger (e.g., on blur/back)
    deleteNote: () => Promise<void>; 
    // lastModified: number | null; // Removed
}

export const useNote = ({
    wineId: passedWineId,
    initialNoteId: passedInitialNoteId,
    initialPassedNote,
    onNoteTextCommitted, 
}: UseNoteProps): UseNoteReturn => {
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(() => {
        const id = passedInitialNoteId || initialPassedNote?.id;
        if (id) return id;
        // If no ID passed, and it's a new note, generate a client-side UUID
        // This client-side ID will be used for local caching and sent to backend.
        // Backend might use it or generate its own and return it.
        return Crypto.randomUUID(); 
    });
    const [noteTextState, setNoteTextState] = useState('');
    const [noteDateState, setNoteDateState] = useState(new Date().toISOString().split('T')[0]);
    
    const [isLoadingState, setIsLoadingState] = useState(true);
    const [errorState, setErrorState] = useState<string | null>(null);

    // Refs to hold the latest values for debounced function
    const latestNoteTextRef = useRef(noteTextState);
    const latestNoteDateRef = useRef(noteDateState);
    const latestCurrentNoteIdRef = useRef(currentNoteId);
    const latestPassedWineIdRef = useRef(passedWineId);
    const onNoteTextCommittedRef = useRef(onNoteTextCommitted);


    const isMounted = useRef(true);
    // const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); // To be replaced by lodash debounce

    // Flag to prevent triggering save during initial load or when programmatically setting text from backend
    const allowSaveTrigger = useRef(false);

    // --- Simplified Local Cache (Optional - can be further simplified or removed if backend is always hit) ---
    // For this refactor, we'll simplify its role. It's mainly for initial load if present.
    const getNoteCacheKey = useCallback((noteId: string) => {
        return cacheService.generateKey(CachePrefix.NOTE_DRAFT, noteId); 
    }, []);

    const _loadInitialNote = useCallback(async () => {
        setIsLoadingState(true);
        allowSaveTrigger.current = false; // Prevent saves during load
        let noteToLoad: Partial<Note> | null = null;

        if (initialPassedNote) {
            noteToLoad = initialPassedNote;
            console.log(`[useNote] Initializing with passedNote: ${initialPassedNote.id}`);
        } else if (latestCurrentNoteIdRef.current) { // Should always be true due to UUID generation
            // Try loading from cache if not passed
            const cachedData = cacheService.get<LocalNoteData>(getNoteCacheKey(latestCurrentNoteIdRef.current));
            if (cachedData) {
                console.log(`[useNote] Initializing with cached draft: ${cachedData.id}`);
                noteToLoad = { 
                    id: cachedData.id, 
                    note_text: cachedData.noteText, 
                    tasting_date: cachedData.noteDate 
                };
            } else {
                // If no initialPassedNote and no cache, and it's an existing ID (passedInitialNoteId),
                // one might fetch from backend here. For now, we assume new if not passed/cached.
                 if (passedInitialNoteId) {
                    console.log(`[useNote] No cache for existing noteId ${passedInitialNoteId}. Consider fetching or starting fresh.`);
                    // Potentially fetch from backend if initialPassedNoteId was given but no initialPassedNote/cache.
                    // For now, if passedInitialNoteId exists but no data, we'll start fresh with that ID.
                    noteToLoad = { id: passedInitialNoteId };
                 } else {
                    // This is a new note (client-generated UUID)
                     console.log(`[useNote] Initializing as new note with client-generated ID: ${latestCurrentNoteIdRef.current}`);
                     noteToLoad = { id: latestCurrentNoteIdRef.current };
                 }
            }
        }

        if (noteToLoad) {
            setNoteTextState(noteToLoad.note_text || '');
            latestNoteTextRef.current = noteToLoad.note_text || '';
            setNoteDateState(noteToLoad.tasting_date ? new Date(noteToLoad.tasting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            latestNoteDateRef.current = noteToLoad.tasting_date ? new Date(noteToLoad.tasting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            if (noteToLoad.id && latestCurrentNoteIdRef.current !== noteToLoad.id) {
                // This can happen if initialPassedNote has a different ID than a generated one
                setCurrentNoteId(noteToLoad.id);
                latestCurrentNoteIdRef.current = noteToLoad.id;
            }
        }
        
        setIsLoadingState(false);
        // Allow saves only after initial setup is complete
        // Add a slight delay to ensure state has settled from initial load
        setTimeout(() => {
            if(isMounted.current) allowSaveTrigger.current = true;
        }, 100);
        console.log("[useNote] Initial load complete. allowSaveTrigger set to true after short delay.");

    }, [initialPassedNote, passedInitialNoteId, getNoteCacheKey]);


    // Debounced save function
    const debouncedSave = useCallback(
        _.debounce(async (noteId: string, text: string, date: string, wineId: string) => {
            if (!isMounted.current || !allowSaveTrigger.current) {
                console.log("[useNote] Debounced save: Aborted (unmounted or save trigger not allowed).");
                return;
            }
            if (!noteId) {
                console.warn('[useNote] Debounced save: Aborted, no note ID.');
                return;
            }

            console.log(`[useNote] Debounced save: Triggering backend sync for note ${noteId}. Text: "${text}"`);
            setErrorState(null); // Clear previous errors on new attempt

            const payload: NoteUpsertPayload = {
                note_id: noteId, // Send client-generated ID for new notes
                wine_id: wineId,
                note_text: text,
                tasting_date: date,
            };

            try {
                const savedNote: Note = await upsertNote(payload);
                console.log(`[useNote] Debounced save: Note ${noteId} synced. Backend ID: ${savedNote.id}.`);

                // Update local cache with synced data
                const localData: LocalNoteData = {
                    id: savedNote.id, // Use ID from backend response
                    wineId: savedNote.wine_id, // Use wine_id from backend response
                    noteText: savedNote.note_text ?? '',
                    noteDate: savedNote.tasting_date ? new Date(savedNote.tasting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    lastModifiedOffline: Date.now(),
                };
                cacheService.set<LocalNoteData>(getNoteCacheKey(savedNote.id), localData);

                if (latestCurrentNoteIdRef.current !== savedNote.id) {
                     // If backend returned a different ID (e.g., for a new note)
                    console.log(`[useNote] Debounced save: Note ID changed by backend from ${latestCurrentNoteIdRef.current} to ${savedNote.id}. Updating local ID.`);
                    // Remove old cached entry if ID changed
                    if (latestCurrentNoteIdRef.current) {
                        cacheService.deleteItem(getNoteCacheKey(latestCurrentNoteIdRef.current));
                    }
                    if (isMounted.current) setCurrentNoteId(savedNote.id);
                    latestCurrentNoteIdRef.current = savedNote.id;
                }
                
                // Call the callback for WineDetailScreen to update optimistically
                onNoteTextCommittedRef.current(savedNote);

            } catch (error: any) {
                console.error(`[useNote] Debounced save: Error syncing note ${noteId}:`, error);
                if (isMounted.current) {
                    setErrorState(error.message || 'Failed to save note.');
                }
            }
        }, SAVE_DEBOUNCE_DELAY),
        [getNoteCacheKey] 
    );

    // Manual save function (e.g., on blur, on back)
    const saveNote = useCallback(async () => {
        if (!allowSaveTrigger.current) {
            console.log("[useNote] Manual save: Aborted (save trigger not allowed).");
            return;
        }
        // Cancel any pending debounced save
        debouncedSave.cancel();

        const noteId = latestCurrentNoteIdRef.current;
        const text = latestNoteTextRef.current;
        const date = latestNoteDateRef.current;
        const wineId = latestPassedWineIdRef.current;

        if (!noteId) {
            console.warn('[useNote] Manual save: Aborted, no note ID.');
            return;
        }
        
        console.log(`[useNote] Manual save: Triggering for note ${noteId}. Text: "${text}"`);
        // Call the debounced function immediately, but it's already the actual save logic
        // We call it directly to bypass debounce timer for immediate action
        await debouncedSave(noteId, text, date, wineId);

    }, [debouncedSave]);


    const handleSetNoteText = useCallback((text: string) => {
        setNoteTextState(text);
        latestNoteTextRef.current = text;
        if (allowSaveTrigger.current && latestCurrentNoteIdRef.current) {
            debouncedSave(latestCurrentNoteIdRef.current, text, latestNoteDateRef.current, latestPassedWineIdRef.current);
        }
    }, [debouncedSave]);

    const handleSetNoteDate = useCallback((date: string) => {
        setNoteDateState(date);
        latestNoteDateRef.current = date;
        if (allowSaveTrigger.current && latestCurrentNoteIdRef.current) {
            debouncedSave(latestCurrentNoteIdRef.current, latestNoteTextRef.current, date, latestPassedWineIdRef.current);
        }
    }, [debouncedSave]);
    
    // Initialization
    useEffect(() => {
        isMounted.current = true;
        _loadInitialNote();
        
        // Update refs when props change
        latestPassedWineIdRef.current = passedWineId;
        onNoteTextCommittedRef.current = onNoteTextCommitted;


        return () => {
            isMounted.current = false;
            debouncedSave.cancel(); // Cancel any pending saves on unmount
            // If there's unsaved text different from initial, consider a final save.
            // For simplicity now, we rely on blur/back handlers in the screen.
            // Could add: if (latestNoteTextRef.current !== initialTextOnLoad && allowSaveTrigger.current) saveNote();
            console.log("[useNote] Unmounted.");
        };
    }, []); // Empty array: Load once on mount. passedWineId and onNoteTextCommitted handled by refs.

     useEffect(() => {
        latestCurrentNoteIdRef.current = currentNoteId;
    }, [currentNoteId]);


    const deleteNote = useCallback(async () => {
        const noteIdToDelete = latestCurrentNoteIdRef.current;
        if (!noteIdToDelete) {
            console.warn("[useNote] Delete called without a note ID.");
            setErrorState("No note selected to delete.");
            return;
        }

        setErrorState(null);
        // Optimistically update UI or rely on parent to handle
        // For now, clear local state and inform parent

        try {
            await deleteNoteService(noteIdToDelete);
            console.log(`[useNote] Note ${noteIdToDelete} deleted from backend.`);
            cacheService.deleteItem(getNoteCacheKey(noteIdToDelete));
            
            // Reset state
            if (isMounted.current) {
                allowSaveTrigger.current = false; // Prevent saves for the now-deleted note
                const newClientSideId = Crypto.randomUUID(); // Prepare for a new note potentially
                setCurrentNoteId(newClientSideId); // Or null if preferred, but UUID helps if user starts typing again
                latestCurrentNoteIdRef.current = newClientSideId;
                setNoteTextState('');
                latestNoteTextRef.current = '';
                setNoteDateState(new Date().toISOString().split('T')[0]);
                latestNoteDateRef.current = new Date().toISOString().split('T')[0];
                
                // Inform parent about deletion
                // The Note type for onNoteTextCommitted expects a full note.
                // For delete, we might need a different callback or use a convention.
                // Here, we'll call onNoteTextCommitted with minimal data indicating deletion,
                // assuming the parent (WineDetailScreen) can interpret this.
                // A more robust way would be a dedicated onDeleteCommitted callback.
                onNoteTextCommittedRef.current({ id: noteIdToDelete, note_text: '', wine_id: passedWineId } as Note);
                
                // Allow save trigger for a new note after a short delay
                 setTimeout(() => {
                    if(isMounted.current) allowSaveTrigger.current = true;
                }, 100);
            }

        } catch (error: any) {
            console.error(`[useNote] Error deleting note ${noteIdToDelete}:`, error);
            if (isMounted.current) {
                setErrorState(error.message || 'Failed to delete note.');
            }
            // Re-throw or handle as needed if optimistic UI needs rollback
        }
    }, [getNoteCacheKey, passedWineId]);

    return {
        noteId: currentNoteId,
        noteText: noteTextState,
        setNoteText: handleSetNoteText,
        noteDate: noteDateState,
        setNoteDate: handleSetNoteDate,
        isLoading: isLoadingState,
        error: errorState,
        saveNote, // Manual save trigger
        deleteNote,
    };
}; 