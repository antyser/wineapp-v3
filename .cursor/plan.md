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

## 4. Image Caching Implementation

### Goal
Implement image caching to improve loading performance and reduce network requests for images across the application, particularly in lists and detail views.

### Strategy
Utilize `expo-image` for its built-in caching capabilities, as it's designed for Expo projects and offers straightforward integration.

### Affected Components
*   `frontend/src/components/SearchHistoryList.tsx`
*   `frontend/src/components/WineListItem.tsx` (This component is used by `SearchResultsScreen.tsx`)
*   `frontend/src/components/WineDetailCard.tsx`
*   Any other components displaying network images from URLs.

### Steps

1.  **Install `expo-image`**:
    *   Ensure `expo-image` is installed. If not, run: `yarn add expo-image`.
    *   Verify it's listed in `package.json`.

2.  **Replace `react-native` `Image` with `expo-image` `Image`**:
    *   **`frontend/src/components/SearchHistoryList.tsx`**:
        *   Change the import from `react-native` to `import { Image } from 'expo-image';`.
        *   Review props used; `expo-image` has a similar API but may have different or additional props for cache control (e.g., `cachePolicy`). The default policy is usually sufficient.
    *   **`frontend/src/components/WineListItem.tsx`**:
        *   Perform the same import change and review props.
    *   **`frontend/src/components/WineDetailCard.tsx`**:
        *   Perform the same import change and review props.
    *   **Placeholder and Styling**: Ensure that placeholder logic and styles are compatible or adjusted for `expo-image`. `expo-image` has a `placeholder` prop and handles transitions.

3.  **Configure Caching (Optional but Recommended)**:
    *   While `expo-image` has default caching, you can explicitly set the `cachePolicy` prop on the `Image` component if needed:
        *   `cachePolicy="memory-disk"` (default): Tries to load from memory, then disk, then network.
        *   `cachePolicy="disk"`: Tries to load from disk, then network.
        *   `cachePolicy="memory"`: Tries to load from memory, then network.
        *   `cachePolicy="none"`: Only loads from the network.
    *   For most cases, the default `memory-disk` is good.

4.  **Test Caching Behavior**:
    *   Load screens that display images (e.g., `SearchResultsScreen`, `WineDetailScreen`, and any screen using `SearchHistoryList`).
    *   Navigate away and back, or reload the app (after the first load).
    *   Observe if images load faster on subsequent views.
    *   Test in an offline scenario (after images have been cached) to confirm they are served from the cache.
    *   Check for any console warnings or errors related to image loading.

5.  **Review and Refine**:
    *   Ensure image aspect ratios and styling are preserved.
    *   Address any layout shifts or visual glitches that might occur after switching the `Image` component.
