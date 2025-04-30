# Frontend Refactoring Plan

**1. Goals:**

*   Separate UI, styling, API logic, and state management concerns *within each screen*.
*   Improve code readability and maintainability.
*   Remove unused code (pending confirmation for Cellar*).
*   Leverage custom hooks for complex/reusable logic identified *during screen refactoring*.
*   Utilize the generated API client consistently.

**2. Analysis:**

*   **Screens to Refactor (Initial Focus):** `LoginScreen`, `HomeScreen`, `SearchResultsScreen`.
*   **Other Screens (Potential Future Focus):** `WineDetailScreen`, `ProfileScreen`, `WineOffersScreen`, `ChatScreen`, `MyWinesScreen`, `AddBottlesScreen`, `TastingNoteScreen`, `WineSearchScreen`, `AddWineScreen`.
*   **Potentially Unused Screens:** `CellarFormScreen`, `CellarDetailScreen`, `CellarStatsScreen`.
*   **Components:** `SearchHistoryList`, `ImagePickerModal`, `LoadingModal`, `SearchBar`, `ActionButtons`, `ChatBox`, `WineDetailCard`, `WineOfferItem`, `WineCard`, `WineListItem`, `WineSection`, `WineRecognitionView`, `wine/*`.
*   **Potentially Unused Components:** `cellar/*`.
*   **API Usage:** Primarily through the generated `searchWinesEndpointApiV1SearchPost` and direct Supabase calls (`supabase.auth`, `supabase.storage`).
*   **Styling:** Uses `StyleSheet.create` per component, which is acceptable. `react-native-paper` theme is used.
*   **State:** Mix of `useState`, `useAuth` context.

**3. Refactoring Strategy:** Screen-by-Screen

We will tackle one screen at a time, applying the following principles:

*   **Isolate Logic:** Move API calls, complex state manipulations, and business logic out of the main screen component into custom hooks (e.g., `useAuthActions`, `useImageSearch`) or service files (e.g., `supabaseService.ts`).
*   **Clean UI Components:** Ensure components rendered by the screen are primarily presentational, receiving data and callbacks via props.
*   **Consistent API Usage:** Replace direct API/Supabase calls with functions from hooks or services. Use the generated API client (`frontend/src/api.ts`).
*   **Simplify State:** Consolidate and streamline local `useState` and context-derived state where possible.
*   **Fix Lint Errors:** Address any linter errors encountered during the refactor.

**4. Refactoring Tasks by Screen:**

*   **`LoginScreen.tsx`:**
    *   [ ] **Fix Linter Error 1:** Investigate and fix `Property 'verifyEmailOtp' does not exist on type 'AuthContextType'`. This likely requires checking/updating `AuthContext.tsx`.
    *   [ ] **Fix Linter Error 2:** Correct the logic checking the result of `signInWithEmailOtp`. Assume it returns `void` or handle its actual return type appropriately instead of checking truthiness.
    *   [ ] **Refactor State:** Simplify the combination of `localLoading`/`isLoading` and `localError`/`error`. Aim for a single source of truth for loading/error status, likely derived from `useAuth`.
    *   [ ] **Refactor Logic (Optional):** Consider moving OTP flow logic (sending code, verifying code) into dedicated functions within `AuthContext` or a specific `useAuthActions` hook if complexity warrants it.
    *   [ ] **API Calls:** Confirm all authentication actions are correctly channeled through `useAuth`.
    *   [ ] **UI/Styling:** Review for clarity, no major changes expected.

*   **`HomeScreen.tsx`:**
    *   [ ] **Create Hook `useImageSearch`:**
        *   [ ] Move image picking logic (`handleImagePick`) including permission checks.
        *   [ ] Move image upload and search logic (`handleImageSearch`) including Supabase Storage interaction and API call.
        *   [ ] Hook should expose: `searchWithImage(useCamera: boolean)`, `isLoading`, `error`.
    *   [ ] **Refactor Text Search:**
        *   [ ] Move text search submission logic (`handleSearchSubmit`) into a reusable function or a `useTextSearch` hook.
        *   [ ] Function/hook should handle calling the API (`searchWinesEndpointApiV1SearchPost`) and managing navigation based on results.
        *   [ ] Function/hook should expose: `searchWithText(query: string)`, `isLoading`, `error`.
    *   [ ] **Create Service `supabaseService.ts`:**
        *   [ ] Add wrapper functions for Supabase Storage operations (`upload`, `getPublicUrl`).
        *   [ ] Update `useImageSearch` hook (or logic within `HomeScreen` if hook isn't created first) to use these wrappers.
    *   [ ] **Refactor State:** Replace the local `loading` state with state exposed by the new hooks (`useImageSearch`, `useTextSearch`).
    *   [ ] **Refactor Auth:** Ensure anonymous sign-in logic uses `useAuth` context methods instead of direct `supabase.auth.signInAnonymously` calls. Update `AuthContext` if needed.
    *   [ ] **UI/Styling:** Ensure child components (`SearchBar`, `ActionButtons`, etc.) receive necessary props and callbacks.

*   **`SearchResultsScreen.tsx`:**
    *   [ ] **UI/Styling:** Verify `WineListItem` is presentational and receives data/callbacks via props.
    *   [ ] **Logic:** Confirm navigation logic (`handleWinePress`) is contained within the screen.
    *   [ ] **API Calls:** Confirm no direct API calls are made here.
    *   [ ] **State:** Confirm minimal local state is used.

*   **`AuthContext.tsx` (Supporting Role):**
    *   [ ] **Add `verifyEmailOtp`:** Implement and expose `verifyEmailOtp` if it's missing (related to `LoginScreen` task).
    *   [ ] **Add Anonymous Sign-In:** Expose a function for anonymous sign-in if not already present (related to `HomeScreen` task).
    *   [ ] **Review Exports:** Ensure all necessary functions and state (`isLoading`, `error`, `user`, `isAuthenticated`, etc.) are correctly exposed in `AuthContextType`.

**5. Code Cleanup (Pending Confirmation):**

*   If confirmed unused:
    *   [ ] Delete `frontend/src/screens/CellarFormScreen.tsx`
    *   [ ] Delete `frontend/src/screens/CellarDetailScreen.tsx`
    *   [ ] Delete `frontend/src/screens/CellarStatsScreen.tsx`
    *   [ ] Delete `frontend/src/components/cellar/` directory.
    *   [ ] Remove corresponding imports and navigation entries from `frontend/src/navigation/RootNavigator.tsx`.
    *   [ ] Remove any other dead code identified during refactoring.

**6. Linting/Formatting:**

*   [ ] Ensure code adheres to configured ESLint/Prettier rules after refactoring each screen.
