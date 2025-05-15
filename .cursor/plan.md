# Plan: Add Interaction Rating Input to TastingNoteScreen

## Goal
Allow users to set or update the overall wine interaction rating (the star rating for the wine itself, managed by `useWineInteractions.ts`) directly from the `TastingNoteScreen`. The `WineDetailScreen` will display this rating and provide access to notes.

## 1. Frontend Changes

### a. Navigation Parameter Updates (`frontend/src/navigation/types.ts`)
*   Update `RootStackParamList` for the `AddTastingNote` route to include:
    *   `currentUserRating: number | null` (current interaction rating for the wine, from `useWineInteractions`)
    *   `onRateWine: (rating: number | null) => void` (the `rateWine` function from `useWineInteractions` to call when the rating changes)

### b. `WineDetailScreen.tsx` (Caller of `AddTastingNote`)
*   **Pass Rating Props via Navigation**:
    *   When navigating from `WineDetailScreen` to `AddTastingNote` (in the `handleAddNote` function):
        *   Pass the `userRating` (obtained from `useWineInteractions`) as the `currentUserRating` parameter.
        *   Pass the `rateWine` function (obtained from `useWineInteractions`) as the `onRateWine` parameter.
*   **Display of Rating and Note on WineDetailScreen**:
    *   The `WineDetailCard` already receives and displays the `rating` (which is `userRating` from `useWineInteractions`) in a read-only format. This is correct.
    *   Access to notes will continue via the "Add Note" / "View/Edit Note" button, navigating to `TastingNoteScreen`.

### c. `TastingNoteScreen.tsx` (Receiver and UI for Rating)
*   **Receive Rating Props**:
    *   Update `NoteScreenRouteProp` to expect `currentUserRating` and `onRateWine`.
    *   Destructure `currentUserRating` and `onRateWine` from `route.params`.
*   **UI for Star Rating Input**:
    *   Add a new UI section for the overall wine rating (e.g., below wine info, above tasting date).
    *   Include a label like "Overall Wine Rating:".
    *   Implement a 5-star rating input (e.g., using tappable `IconButton` components).
        *   Stars should reflect `currentUserRating` prop.
        *   Tapping a star calls `onRateWine` prop with the new rating.
*   **Appbar Title**:
    *   Change `Appbar.Content title` to be static (e.g., "Add Tasting Note" or "Edit Tasting Note") instead of the potentially long wine name.
*   **State Management**: The screen will use props for rating display (`currentUserRating`) and updates (`onRateWine`), not local state for the rating itself.

### d. `WineDetailCard.tsx`
*   Continues to display the overall wine rating in a read-only format. No changes needed for rating input here.

### e. `useNote.ts` (Tasting Note Hook)
*   **No Changes Needed**: This hook manages note text/date, not the overall wine rating.

### f. `useWineInteractions.ts` (Wine Interaction Hook)
*   **No Changes Needed**: This hook already provides `userRating` and `rateWine`. Its state will be updated correctly when `rateWine` is called from `TastingNoteScreen`.

## 2. Backend Changes
*   **No Changes Needed**: Overall wine rating is part of existing interaction data and services.

## 3. Testing Considerations
*   Verify that setting/changing the rating on `TastingNoteScreen` updates the `userRating` in `useWineInteractions`.
*   Confirm this updated rating is reflected on `WineDetailScreen` (in `WineDetailCard`).
*   Ensure saving a tasting note (text/date) is independent of changing the wine's interaction rating.
