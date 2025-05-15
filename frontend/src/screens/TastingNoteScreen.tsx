import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { TextInput, Text, Snackbar, useTheme, Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Rating } from 'react-native-ratings';

import { RootStackParamList } from '../navigation/types';
import { Note } from '../api'; // Re-added Note import
import { useNote } from '../hooks/useNote'; // Import the new hook

type NoteScreenRouteProp = RouteProp<RootStackParamList, 'AddTastingNote'> & {
    params: { 
        onNoteTextCommitted?: (updatedNote: Note) => void; 
    }
};

type NoteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NoteScreen = () => {
    const route = useRoute<NoteScreenRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const theme = useTheme();
    const {
        wineId: passedWineId,
        note: passedInitialNote,
        currentUserRating: initialRatingFromParams, // Renamed for clarity
        onRateWine,
        onNoteTextCommitted, // Get the new callback from route params
    } = route.params;

    // Local state for the rating displayed and manipulated on this screen
    const [localDisplayedRating, setLocalDisplayedRating] = useState<number>(() => initialRatingFromParams ?? 0);

    // Effect to sync localDisplayedRating if the initial prop changes (e.g. if screen can be re-focused with new params, though unlikely here)
    useEffect(() => {
        setLocalDisplayedRating(initialRatingFromParams ?? 0);
    }, [initialRatingFromParams]);

    const {
        noteId,
        noteText,
        setNoteText,
        isLoading,
        error,
        saveNote, // Use this for explicit saves
    } = useNote({
        wineId: passedWineId,
        initialNoteId: passedInitialNote?.id,
        initialPassedNote: passedInitialNote,
        onNoteTextCommitted: onNoteTextCommitted || ((committedNote: Note) => { 
            console.warn("[TastingNoteScreen] onNoteTextCommitted was not provided via route params.", committedNote);
        }),
    });

    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // Effect to show snackbar for critical errors from useNote
    useEffect(() => {
        if (error) {
            setSnackbarMessage(error); // Show error from useNote
            setShowSnackbar(true);
        }
    }, [error]);

    useFocusEffect(
        useCallback(() => {
            console.log('[TastingNoteScreen] Focused.'); 
            return () => {
                console.log('[TastingNoteScreen] Focus lost (blurred). Triggering saveNote.');
                saveNote(); // Fire-and-forget save on blur
            };
        }, [saveNote]) 
    );

    useEffect(() => {
        const onBeforeRemove = (e: any) => {
            console.log('[TastingNoteScreen] beforeRemove triggered. Calling saveNote.');
            saveNote(); 
        };

        navigation.addListener('beforeRemove', onBeforeRemove);
        return () => {
            navigation.removeListener('beforeRemove', onBeforeRemove);
        };
    }, [navigation, saveNote]); // saveNote added as dependency

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text>Loading Note...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Controls Container and its buttons are removed */}

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {/* Overall Wine Rating Input */}
                <View style={styles.ratingSectionContainer}>
                    <Rating
                        type='star'
                        ratingCount={5}
                        imageSize={38}
                        startingValue={localDisplayedRating}
                        showRating={true}
                        fractions={1}
                        jumpValue={0.1}
                        ratingTextColor={theme.colors.primary}
                        onFinishRating={(rating: number) => {
                            setLocalDisplayedRating(rating);
                            if (onRateWine) {
                                onRateWine(rating);
                            }
                        }}
                        tintColor={theme.colors.surface}
                        style={styles.ratingComponentStyle}
                    />
                </View>

                {/* Tasting Notes Text Area */}
                <TextInput
                    label="Your Tasting Notes"
                    value={noteText}
                    onChangeText={setNoteText} 
                    style={styles.textarea}
                    multiline
                    numberOfLines={10} // Increased lines
                    mode="outlined"
                    placeholder="Describe the appearance, aroma, taste, and overall impression..."
                    disabled={isLoading}
                    dense
                />
                {/* Removed debug texts for syncStatus, lastModified, noteId */}
                 {/* Error display is now handled by the snackbar */}
            </ScrollView>

            <Snackbar
                visible={showSnackbar}
                onDismiss={() => setShowSnackbar(false)}
                duration={3000}
            >
                {snackbarMessage}
            </Snackbar>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Removed for SafeAreaView
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16, // Add padding to top of scroll content
    },
    ratingSectionContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16, // Increased padding
        paddingHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
    },
    ratingLabel: {
        marginBottom: 12, // Increased margin
        textAlign: 'center',
        fontWeight: '500',
    },
    ratingComponentStyle: {
        paddingVertical: 10, 
        alignSelf: 'center', // Center the rating component itself
    },
    textarea: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        height: 250, // Increased height
        fontSize: 16, // Slightly larger font for notes
    },
    // Removed errorText style as it's replaced by snackbar for critical errors
    // Removed debugText style
});

export default NoteScreen; 