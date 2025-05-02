import { apiClient } from '../index';
import { Note, NoteCreate, NoteUpdate, NoteUpsertPayload } from '../generated/types.gen'; // Import relevant types

/**
 * Creates a new note.
 * POST /api/v1/notes/
 */
export const createNote = async (noteData: NoteCreate): Promise<Note> => {
  try {
    const response = await apiClient.post<Note>('/api/v1/notes/', noteData);
    return response.data;
  } catch (error) {
    console.error("[notesService] Error creating note:", error);
    throw error; // Re-throw original error
  }
};

/**
 * Fetches notes for a specific wine.
 * GET /api/v1/notes/wine/{wine_id}
 */
export const getNotesByWine = async (wineId: string): Promise<Note[]> => {
  try {
    const response = await apiClient.get<Note[]>(`/api/v1/notes/wine/${wineId}`);
    // Handle cases where the API might return nothing for no notes, default to empty array
    return response.data || []; 
  } catch (error) {
    console.error(`[notesService] Error fetching notes for wine ${wineId}:`, error);
    throw error; // Re-throw original error
  }
};

/**
 * Updates an existing note.
 * PATCH /api/v1/notes/{note_id}
 */
export const updateNote = async (noteId: string, noteData: NoteUpdate): Promise<Note> => {
  try {
    const response = await apiClient.patch<Note>(`/api/v1/notes/${noteId}`, noteData);
    return response.data;
  } catch (error) {
    console.error(`[notesService] Error updating note ${noteId}:`, error);
    throw error; // Re-throw original error
  }
};

/**
 * Deletes a note.
 * DELETE /api/v1/notes/{note_id}
 */
export const deleteNote = async (noteId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/v1/notes/${noteId}`);
    return response.data;
  } catch (error) {
    console.error(`[notesService] Error deleting note ${noteId}:`, error);
    throw error; // Re-throw original error
  }
};

/**
 * Upserts a note.
 * POST /api/v1/notes/upsert
 */
export const upsertNote = async (noteData: NoteUpsertPayload): Promise<Note> => {
  try {
    const response = await apiClient.post<Note>('/api/v1/notes/upsert', noteData);
    return response.data;
  } catch (error) {
    console.error("[notesService] Error upserting note:", error);
    throw error; // Re-throw original error
  }
};

// Add getNoteById if needed: GET /api/v1/notes/{note_id}
// Add getNotesByUser if needed: GET /api/v1/notes/user/{user_id} 