import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, TextInput, Text, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { 
  getOneWineApiV1WinesWineIdGet,
  getNotesByWineApiV1NotesWineWineIdGet,
  getNoteByIdApiV1NotesNoteIdGet,
  createNoteApiV1NotesPost,
  updateNoteApiV1NotesNoteIdPatch
} from '../api';

type NoteScreenRouteProp = RouteProp<RootStackParamList, 'AddTastingNote'>;
type NoteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NoteScreen = () => {
  const route = useRoute<NoteScreenRouteProp>();
  const navigation = useNavigation<NoteScreenNavigationProp>();
  const theme = useTheme();
  const { wineId, noteId } = route.params;

  const [loading, setLoading] = useState(true);
  const [wine, setWine] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [existingNoteId, setExistingNoteId] = useState<string | undefined>(noteId);
  const [noteHasChanges, setNoteHasChanges] = useState(false);
  
  // Ref for auto-save timeout
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save note when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        // This runs when leaving the screen
        if (noteHasChanges && noteText.trim()) {
          saveNote();
        }
        
        // Clear any existing timeout when leaving the screen
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }, [noteText, noteDate, noteHasChanges])
  );

  useEffect(() => {
    // Load wine details
    fetchWineDetails();
    
    // If noteId is provided directly, use it to fetch the note
    if (noteId) {
      fetchNoteById(noteId);
    } else {
      // Otherwise check for existing notes
      fetchExistingNotes();
    }
  }, [wineId, noteId]);

  // Auto-save when note changes
  useEffect(() => {
    if (noteHasChanges && noteText.trim()) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-saving
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveNote();
        console.log('Auto-saving note...');
      }, 1000); // 1 second delay
    }
    
    return () => {
      // Clean up timeout on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [noteText, noteDate, noteHasChanges]);

  const fetchWineDetails = async () => {
    try {
      const response = await getOneWineApiV1WinesWineIdGet({
        path: { wine_id: wineId }
      });
      
      if (response.data) {
        setWine(response.data);
      }
    } catch (error) {
      console.error('Error fetching wine details:', error);
      setError('Failed to load wine details');
    } finally {
      if (!noteId) {
        setLoading(false);
      }
    }
  };

  const fetchExistingNotes = async () => {
    try {
      setLoading(true);
      const response = await getNotesByWineApiV1NotesWineWineIdGet({
        path: { wine_id: wineId }
      });
      
      if (response.data && response.data.length > 0) {
        // Use the most recent note
        const latestNote = response.data[0];  // Assumes notes are returned in desc order
        if (latestNote && typeof latestNote === 'object') {
          // Use type assertion to handle unknown type
          const noteData = latestNote as any;
          
          if (noteData.note_text) {
            setNoteText(String(noteData.note_text));
          }
          
          if (noteData.tasting_date) {
            setNoteDate(String(noteData.tasting_date));
          }
          
          if (noteData.rating_5) {
            setRating(Number(noteData.rating_5));
          }
          
          if (noteData.id) {
            setExistingNoteId(String(noteData.id));
          }
        }
      } else {
        // No existing notes found - create a default empty note
        console.log('No existing notes found, creating a new empty note...');
        createDefaultNote();
      }
    } catch (error) {
      console.error('Error fetching existing notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to create a default empty note
  const createDefaultNote = async () => {
    try {
      console.log('Creating default note for wine:', wineId);
      
      const response = await createNoteApiV1NotesPost({
        body: {
          wine_id: wineId,
          note_text: '', // Empty note to start with
          tasting_date: noteDate
        }
      });
      
      if (response.data && response.data.id) {
        setExistingNoteId(response.data.id);
        console.log('Default note created with ID:', response.data.id);
      } else {
        console.error('Note creation response missing data or ID:', response);
      }
    } catch (createError: any) {
      console.error('Error creating default note:', createError);
      console.error('Error details:', createError.response?.data || createError.message);
    }
  };

  const fetchNoteById = async (id: string) => {
    try {
      setLoading(true);
      // Using the new getNoteById endpoint
      const response = await getNoteByIdApiV1NotesNoteIdGet({
        path: { note_id: id }
      });
      
      if (response.data) {
        // The response will be a properly typed Note object
        const noteData = response.data;
        
        if (noteData.note_text) {
          setNoteText(noteData.note_text);
        }
        
        if (noteData.tasting_date) {
          setNoteDate(noteData.tasting_date);
        }
        
        setExistingNoteId(id);
      }
    } catch (error) {
      console.error('Error fetching note details:', error);
      setError('Failed to load note details');
    } finally {
      setLoading(false);
    }
  };

  // Save note (used for both manual and auto-save)
  const saveNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    try {
      if (existingNoteId) {
        // Update existing note using direct note ID
        await updateNoteApiV1NotesNoteIdPatch({
          path: { note_id: existingNoteId },
          body: {
            note_text: noteText,
            tasting_date: noteDate
          }
        });
        console.log('Existing note updated successfully');
      } else {
        console.log('Creating new note for wine:', wineId);
        
        // Create a new note and store its ID
        try {
          const response = await createNoteApiV1NotesPost({
            body: {
              wine_id: wineId,
              note_text: noteText,
              tasting_date: noteDate
            }
          });
          
          if (response.data && response.data.id) {
            setExistingNoteId(response.data.id);
            console.log('New note created with ID:', response.data.id);
          } else {
            console.error('Note creation response missing data or ID:', response);
          }
        } catch (createError: any) {
          console.error('Error creating note:', createError);
          console.error('Create error details:', createError.response?.data || createError.message);
          throw createError; // Re-throw to be caught by outer catch
        }
      }
      
      setNoteHasChanges(false);
      setShowSnackbar(true);
      setSnackbarMessage('Note saved successfully');
    } catch (error: any) {
      console.error('Error saving note:', error);
      console.error('Error details:', error.response?.data || error.message);
      setShowSnackbar(true);
      setSnackbarMessage('Failed to save note. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Note" />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        {wine && (
          <View style={styles.wineInfoContainer}>
            <Text variant="titleLarge">{wine.name}</Text>
            {wine.vintage && wine.vintage !== 1 && (
              <Text variant="titleMedium">{wine.vintage}</Text>
            )}
            {wine.producer && (
              <Text variant="bodyLarge">{wine.producer}</Text>
            )}
          </View>
        )}
        
        <TextInput
          label="Tasting Date"
          value={noteDate}
          onChangeText={(text) => {
            setNoteDate(text);
            setNoteHasChanges(true);
          }}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Your Tasting Notes"
          value={noteText}
          onChangeText={(text) => {
            setNoteText(text);
            setNoteHasChanges(true);
          }}
          style={styles.textarea}
          multiline
          numberOfLines={8}
          mode="outlined"
          placeholder="Describe the appearance, aroma, taste, and overall impression..."
        />
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
      
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
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