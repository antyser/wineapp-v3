import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Appbar, TextInput, Text, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/types';
import { Wine, Note, NoteCreate, NoteUpdate, NoteUpsertPayload } from '../api';
import { upsertNote } from '../api/services/notesService';

type NoteScreenRouteProp = RouteProp<RootStackParamList, 'AddTastingNote'>;
type NoteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LocalNoteData {
    id: string;
    wineId: string;
    noteText: string;
    noteDate: string;
    lastModified: number;
    syncStatus: 'pending' | 'synced' | 'failed';
}

const ASYNC_STORAGE_NOTE_PREFIX = 'note_';

const NoteScreen = () => {
    const route = useRoute<NoteScreenRouteProp>();
    const navigation = useNavigation<NoteScreenNavigationProp>();
    const theme = useTheme();
    const { wineId: passedWineId, wine: passedWine, note: passedNote } = route.params;

    const [wine, setWine] = useState<Wine | null>(passedWine || null);
    const [noteText, setNoteText] = useState('');
    const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentNoteId, setCurrentNoteId] = useState<string>(() => passedNote?.id || Crypto.randomUUID());
    const [isInitialized, setIsInitialized] = useState(false);

    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);
    const initialSyncCheckDone = useRef(false);
    const syncTriggerAllowed = useRef(true);
    const noteTextRef = useRef(noteText);
    const noteDateRef = useRef(noteDate);

    const getNoteStorageKey = (noteId: string) => `${ASYNC_STORAGE_NOTE_PREFIX}${noteId}`;

    const saveNoteLocally = useCallback(async (noteData: Omit<LocalNoteData, 'id' | 'wineId'>): Promise<boolean> => {
        const storageKey = getNoteStorageKey(currentNoteId);
        const dataToSave: LocalNoteData = {
            ...noteData,
            id: currentNoteId,
            wineId: passedWineId,
        };
        const saveStartTime = Date.now(); // Timing start
        console.time(`saveNoteLocally_${currentNoteId}`); // Start timer with unique key
        try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
            console.timeEnd(`saveNoteLocally_${currentNoteId}`); // End timer
            const saveEndTime = Date.now(); // Timing end
            console.log(`[TastingNoteScreen] Saved note ${currentNoteId} locally. Status: ${dataToSave.syncStatus}. Duration: ${saveEndTime - saveStartTime}ms`);
            return true;
        } catch (error) {
             console.timeEnd(`saveNoteLocally_${currentNoteId}`); // End timer even on error
            console.error(`[TastingNoteScreen] Error saving note ${currentNoteId} locally:`, error);
            return false;
        }
    }, [currentNoteId, passedWineId]);

    const loadNoteLocally = useCallback(async (noteId: string): Promise<LocalNoteData | null> => {
        const key = getNoteStorageKey(noteId);
        try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
                const parsedData = JSON.parse(data) as LocalNoteData;
                console.log(`[TastingNoteScreen] Loaded note ${noteId} locally. Status: ${parsedData.syncStatus}`);
                return parsedData;
            }
            console.log(`[TastingNoteScreen] No local data found for note ${noteId}.`);
            return null;
        } catch (error) {
            console.error(`[TastingNoteScreen] Error loading note ${noteId} locally:`, error);
            return null;
        }
    }, []);

    const syncNoteToBackend = useCallback(async () => {
        if (!syncTriggerAllowed.current) { 
            console.log(`[TastingNoteScreen] Sync trigger aborted for ${currentNoteId} (unmounting).`);
            return;
        }
        console.log(`[TastingNoteScreen] Attempting backend sync for note ${currentNoteId}...`);

        const localData = await loadNoteLocally(currentNoteId);
        if (!localData || localData.syncStatus === 'synced' || !localData.noteText.trim()) {
            console.log(`[TastingNoteScreen] Sync skipped for ${currentNoteId}. Status: ${localData?.syncStatus}, Text empty: ${!localData?.noteText.trim()}`);
            return;
        }

        const payload: NoteUpsertPayload = {
            note_id: localData.id,
            wine_id: localData.wineId,
            note_text: localData.noteText,
            tasting_date: localData.noteDate,
        };

        try {
            const savedNote: Note = await upsertNote(payload); 
            console.log(`[TastingNoteScreen] Note ${currentNoteId} synced successfully with backend. ID: ${savedNote.id}`);

            if (!isMounted.current) return;

            const dataForLocalSave: Omit<LocalNoteData, 'id' | 'wineId'> = {
                noteText: savedNote.note_text,
                noteDate: savedNote.tasting_date ? new Date(savedNote.tasting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastModified: Date.now(),
                syncStatus: 'synced',
            };

            const fullDataToSaveLocally: LocalNoteData = {
                ...dataForLocalSave,
                id: savedNote.id,
                wineId: localData.wineId,
            };

            await saveNoteLocally(fullDataToSaveLocally); 
            console.log(`[TastingNoteScreen] Updated local cache for ${savedNote.id} with synced status.`);

            if (currentNoteId !== savedNote.id) {
                 console.warn(`[TastingNoteScreen] Note ID mismatch after sync. Local: ${currentNoteId}, Backend: ${savedNote.id}. Updating state.`);
            }
             
            noteTextRef.current = savedNote.note_text;
            noteDateRef.current = dataForLocalSave.noteDate;

            setSnackbarMessage('Note synced');
            setShowSnackbar(true);

        } catch (error: any) {
            console.error(`[TastingNoteScreen] Error syncing note ${currentNoteId} to backend:`, error);
            if (!isMounted.current) return;
            
            const currentLocalDataOnError = await loadNoteLocally(currentNoteId);
            if (currentLocalDataOnError) {
                 const errorDataToSave: LocalNoteData = {
                     id: currentLocalDataOnError.id || currentNoteId,
                     wineId: currentLocalDataOnError.wineId || passedWineId,
                     noteText: currentLocalDataOnError.noteText,
                     noteDate: currentLocalDataOnError.noteDate,
                     lastModified: currentLocalDataOnError.lastModified,
                     syncStatus: 'failed',
                 };
                 await saveNoteLocally(errorDataToSave);
                 console.log(`[TastingNoteScreen] Marked local cache for ${errorDataToSave.id} as failed.`);
            } else {
                 console.error(`[TastingNoteScreen] Could not load local data ${currentNoteId} to mark as failed.`);
            }
            Alert.alert('Sync Error', error.message || 'Could not sync the note with the server. Your changes are saved locally.');
        }
    }, [currentNoteId, loadNoteLocally, saveNoteLocally, passedWineId]);

    const saveAndSyncDebounced = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(async () => {
            if (!isMounted.current || !isInitialized) return;

            console.log('[TastingNoteScreen] Debounce timer expired, performing local save & triggering sync...');
            syncTriggerAllowed.current = true;

            const localSaveSuccess = await saveNoteLocally({
                noteText: noteTextRef.current, 
                noteDate: noteDateRef.current,
                lastModified: Date.now(),
                syncStatus: 'pending',
            });

            if (localSaveSuccess) {
                syncNoteToBackend().catch(err => {
                    console.error("[TastingNoteScreen] Background sync failed (debounced):", err);
                });
            }
        }, 1000);
    }, [isInitialized, saveNoteLocally, syncNoteToBackend]);

    useEffect(() => {
        isMounted.current = true;
        syncTriggerAllowed.current = true;
        return () => {
            isMounted.current = false;
            syncTriggerAllowed.current = false;
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const initialize = async () => {
            console.log(`[TastingNoteScreen] Initializing for note ID: ${currentNoteId}`);
            let dataToUse: Partial<LocalNoteData> = {
                noteText: '',
                noteDate: new Date().toISOString().split('T')[0],
                syncStatus: 'pending',
            };
            let existingLocalData: LocalNoteData | null = null;

            existingLocalData = await loadNoteLocally(currentNoteId);

            if (existingLocalData) {
                console.log("[TastingNoteScreen] Found existing local data. Using local data.");
                dataToUse = existingLocalData;
            } else if (passedNote) {
                console.log("[TastingNoteScreen] Using passedNote data (no local found).");
                dataToUse = {
                    noteText: passedNote.note_text || '',
                    noteDate: passedNote.tasting_date ? new Date(passedNote.tasting_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    lastModified: Date.now(), 
                    syncStatus: 'synced', 
                };
                await saveNoteLocally({
                    noteText: dataToUse.noteText!,
                    noteDate: dataToUse.noteDate!,
                    lastModified: dataToUse.lastModified!,
                    syncStatus: dataToUse.syncStatus!
                });
            } else {
                console.log("[TastingNoteScreen] No local data or passedNote. Creating new local entry.");
                dataToUse.lastModified = Date.now();
                await saveNoteLocally({
                    noteText: dataToUse.noteText!,
                    noteDate: dataToUse.noteDate!,
                    lastModified: dataToUse.lastModified!,
                    syncStatus: dataToUse.syncStatus!
                });
                initialSyncCheckDone.current = true; 
                if (syncTriggerAllowed.current && dataToUse.noteText) { 
                    console.log("[TastingNoteScreen] Triggering initial sync for new note.");
                    syncNoteToBackend().catch(err => console.error("Initial sync failed", err));
                }
            }

            if (!isMounted.current) return;

            setNoteText(dataToUse.noteText || '');
            setNoteDate(dataToUse.noteDate || new Date().toISOString().split('T')[0]);
            noteTextRef.current = dataToUse.noteText || '';
            noteDateRef.current = dataToUse.noteDate || new Date().toISOString().split('T')[0];
            setIsInitialized(true);
            console.log(`[TastingNoteScreen] Initialized. Local Sync Status was: ${dataToUse.syncStatus}`);
            
            if (!initialSyncCheckDone.current && (dataToUse.syncStatus === 'pending' || dataToUse.syncStatus === 'failed')) {
                if (syncTriggerAllowed.current) {
                    console.log(`[TastingNoteScreen] Triggering sync for status: ${dataToUse.syncStatus}`);
                    syncNoteToBackend().catch(err => console.error("Initial sync check failed", err));
                }
            }
            initialSyncCheckDone.current = true;
        };

        initialize();
    }, [loadNoteLocally, passedNote, currentNoteId, saveNoteLocally, syncNoteToBackend]);

    useEffect(() => {
        if (isInitialized) {
            saveAndSyncDebounced();
        }
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [noteText, noteDate, isInitialized, saveAndSyncDebounced]);

    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            syncTriggerAllowed.current = true;
            return async () => {
                 console.log('[TastingNoteScreen] Focus lost (useFocusEffect cleanup). Handling local save...');
                 isMounted.current = false;
                 syncTriggerAllowed.current = false;
                 if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current);
                }
                 if (isInitialized) {
                     console.log('[TastingNoteScreen] Awaiting local save on focus lost using refs...');
                     try {
                         await saveNoteLocally({
                             noteText: noteTextRef.current,
                             noteDate: noteDateRef.current,
                             lastModified: Date.now(),
                             syncStatus: 'pending',
                         });
                         console.log('[TastingNoteScreen] Local save completed on focus lost.');
                         syncNoteToBackend().catch(err => console.error("Background sync on focus lost failed:", err));
                     } catch (err) {
                         console.error("Awaited local save on focus lost failed:", err);
                     }
                 } else {
                     console.log('[TastingNoteScreen] Skipping save on focus lost (not initialized).');
                 }
            };
        }, [isInitialized, saveNoteLocally, syncNoteToBackend]) 
    );

    const handleNoteTextChange = (text: string) => {
        setNoteText(text);
        noteTextRef.current = text;
    };
    const handleNoteDateChange = (text: string) => {
        setNoteDate(text);
        noteDateRef.current = text;
    };

    if (!isInitialized) {
        return (
            <View style={styles.container}>
                <Appbar.Header style={styles.appbar}>
                    <Appbar.BackAction onPress={() => navigation.goBack()} disabled />
                    <Appbar.Content title="Loading Note..." />
                </Appbar.Header>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Appbar.Header style={styles.appbar}>
                 <Appbar.BackAction onPress={() => {
                     console.log('[TastingNoteScreen] Back pressed. Handling local save...');
                     syncTriggerAllowed.current = false;
                     if (debounceTimeoutRef.current) {
                         clearTimeout(debounceTimeoutRef.current);
                     }
                     if (isInitialized) {
                          console.log('[TastingNoteScreen] Triggering non-awaited local save on back press.');
                         saveNoteLocally({
                             noteText: noteTextRef.current,
                             noteDate: noteDateRef.current,
                             lastModified: Date.now(),
                             syncStatus: 'pending',
                         }).then(localSaveSuccess => {
                             if (localSaveSuccess) {
                                 console.log('[TastingNoteScreen] Triggering final sync after local save (non-awaited).');
                                 syncNoteToBackend().catch(err => console.error("Sync on goBack failed:", err));
                             }
                         }).catch(err => {
                             console.error("Local save on back press failed:", err);
                         });
                     } else {
                         console.log('[TastingNoteScreen] Skipping save on back press (not initialized).');
                     }
                     if (navigation.canGoBack()) {
                         navigation.goBack();
                     }
                 }} />
                <Appbar.Content title={passedWine?.name || 'Tasting Note'} />
            </Appbar.Header>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <>
                    {wine && (
                        <View style={styles.wineInfoContainer}>
                            <Text variant="titleLarge">{wine.name}</Text>
                            {wine.vintage && wine.vintage !== 1 && (
                                <Text variant="titleMedium">{wine.vintage}</Text>
                            )}
                            {wine.winery && (
                                <Text variant="bodyLarge">{wine.winery}</Text>
                            )}
                        </View>
                    )}

                    <TextInput
                        label="Tasting Date"
                        value={noteDate}
                        onChangeText={handleNoteDateChange}
                        style={styles.input}
                        mode="outlined"
                    />

                    <TextInput
                        label="Your Tasting Notes"
                        value={noteText}
                        onChangeText={handleNoteTextChange}
                        style={styles.textarea}
                        multiline
                        numberOfLines={8}
                        mode="outlined"
                        placeholder="Describe the appearance, aroma, taste, and overall impression..."
                    />
                </>
            </ScrollView>

            <Snackbar
                visible={showSnackbar}
                onDismiss={() => setShowSnackbar(false)}
                duration={2000}
            >
                {snackbarMessage}
            </Snackbar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appbar: {
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    wineInfoContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    textarea: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        height: 200,
    },
    errorText: {
        color: '#B00020',
        marginTop: 8,
    },
});

export default NoteScreen; 