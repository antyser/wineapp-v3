# Frontend Refactor Plan: Optimistic UI Updates

## Goal
Improve perceived performance and responsiveness by implementing optimistic UI updates for key user interactions in `HomeScreen`, `WineDetailScreen`, and `TastingNoteScreen`.

## Strategy
For designated actions (liking, wishlisting, rating, saving notes, sending chat messages, updating search history):
1.  **Immediate Local Update:** Update the component's or global state immediately upon user action to reflect the expected outcome.
2.  **Background Sync:** Initiate the API call asynchronously to persist the change on the server.
3.  **Subtle Feedback:** Provide non-blocking visual cues (e.g., faded icons, small spinners, status text like "saving...") to indicate syncing status.
4.  **Success Handling:** On successful API response, remove feedback indicators. Update local state with server-generated data (like IDs, timestamps) if necessary.
5.  **Failure Handling:** On API error:
    *   Revert local state to its previous value (before the optimistic update).
    *   Clearly notify the user of the failure (e.g., Snackbar, Alert, error icon).
    *   Provide a retry mechanism where appropriate.

## Implementation Plan

1.  **Refactor `useWineInteractions` (`WineDetailScreen` interactions):**
    *   Modify `triggerSave` to store the previous state (`isInWishlist`, `isLiked`, `userRating`) before applying optimistic updates.
    *   Implement state rollback logic within the `catch` block of `triggerSave` using the stored previous state.
    *   Review and potentially adjust the `isSaving` visual feedback to be less intrusive (e.g., subtle icon changes).

2.  **Refactor `TastingNoteScreen` (Note Saving):**
    *   Enhance the debounced auto-save logic:
        *   Introduce an explicit sync status state (e.g., `isSynced: boolean`, `syncStatus: 'idle' | 'saving' | 'synced' | 'error'`).
        *   Update `syncStatus` to 'saving' immediately when changes trigger the debounce timer.
        *   Modify `saveNoteAsync`:
            *   Store the *pre-save* `noteText` and `noteDate` values.
            *   On API success: Update `syncStatus` to 'synced', update `lastSavedNoteText`/`lastSavedNoteDate`.
            *   On API failure: Revert `noteText`/`noteDate` to the stored pre-save values, set `syncStatus` to 'error', notify the user clearly.
        *   Ensure the UI reflects the `syncStatus` (e.g., "Saving...", "Saved", "Error saving").

3.  **Refactor `HomeScreen` (Search History - *if applicable*):**
    *   Identify/Create the logic for managing local search history state.
    *   When a search completes successfully, optimistically update the local history list.
    *   Trigger a background function to persist the history update.
    *   Handle persistence failure: Revert the local list change and notify the user.

4.  **Testing:**
    *   Verify successful optimistic updates across all affected components.
    *   Simulate network/API errors to test state rollback and error notification logic thoroughly.
    *   Test edge cases like rapid repeated actions (e.g., fast liking/unliking) and offline scenarios.

---

## Todo List

-   [x] **`useWineInteractions`:** Implement state rollback on error.
-   [x] **`useWineInteractions`:** Store previous state before optimistic updates.
-   [ ] **`TastingNoteScreen`:** Introduce `syncStatus` state.
-   [ ] **`TastingNoteScreen`:** Implement optimistic save (`saveNoteAsync`) with state rollback on error.
-   [ ] **`TastingNoteScreen`:** Update UI to reflect `syncStatus`.
-   [ ] **`HomeScreen`:** Implement optimistic UI for Search History updates (*conditional on feature existence/priority*).
-   [ ] **UI:** Add/Refine subtle "syncing/error" indicators for optimistic actions where needed.
-   [ ] **Testing:** Test success paths for all optimistic updates.
-   [ ] **Testing:** Test failure paths (network/API errors) and verify rollback/notification.
-   [ ] **Testing:** Test rapid interaction edge cases.
