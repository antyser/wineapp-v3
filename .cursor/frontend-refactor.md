# Frontend Refactor Plan: Optimistic UI & MMKV Caching

## Goal
Improve perceived performance and responsiveness by implementing optimistic UI updates for key user interactions AND leveraging `react-native-mmkv` for fast, synchronous caching of frequently accessed data (search history, wine details, user interactions, notes, chat messages, user profile).

## Strategy: Caching with MMKV

1.  **Install & Setup:** Integrate `react-native-mmkv`. Consider creating a simple wrapper service (`cacheService.ts`) for typed access, consistent key generation (e.g., `cache:wine:${wineId}`), and potentially handling timestamps/TTL.
2.  **Synchronous Read:** On component/hook initialization, attempt a *synchronous* read from MMKV for relevant data.
3.  **Stale-While-Revalidate:**
    *   If MMKV cache exists (and is reasonably fresh based on a stored timestamp), display it *immediately*.
    *   *Simultaneously*, trigger the asynchronous API fetch in the background.
    *   When the API returns fresh data, update the React state *and* update the MMKV cache with the new data and timestamp.
4.  **Cache Write:** Always write successfully fetched/updated data back to MMKV.
5.  **Cache Invalidation:** Implement strategies to invalidate or update the cache when data changes (e.g., after saving a note, update the cached notes list for that wine). Clear relevant cache on logout.

## Strategy: Optimistic UI (Complementary to Caching)

For designated actions (liking, wishlisting, rating, saving notes, sending chat messages, updating search history):
1.  **Immediate Local Update:** Update the component's or global state *and* the relevant MMKV cache immediately upon user action to reflect the expected outcome.
2.  **Background Sync:** Initiate the API call asynchronously to persist the change on the server.
3.  **Subtle Feedback:** Provide non-blocking visual cues to indicate syncing status.
4.  **Success Handling:** On successful API response, remove feedback indicators. Update local state/MMKV with server-generated data (like IDs, timestamps) if necessary.
5.  **Failure Handling:** On API error:
    *   Revert local state *and* the MMKV cache to their previous values (before the optimistic update).
    *   Clearly notify the user of the failure.
    *   Provide a retry mechanism where appropriate.

## Implementation Plan & MMKV Integration

1.  **Setup:**
    *   Install `react-native-mmkv`.
    *   Create `cacheService.ts` (or similar) to manage MMKV instances, keys, and basic get/set/delete operations with type safety and timestamping.

2.  **Auth (`AuthContext` / Profile):**
    *   **MMKV:** Cache user profile data (fetched after login) in MMKV (`cache:userProfile:${userId}`).
    *   **Read:** Load profile synchronously from MMKV on app start if available.
    *   **Write:** Update MMKV cache after successful login/profile fetch.
    *   **Note:** Let Supabase/secure storage handle auth *tokens*. Cache only non-sensitive profile data needed quickly. Clear on logout.

3.  **Search History (`HomeScreen`):**
    *   **MMKV:** Store search history array (`cache:searchHistory`).
    *   **Read:** Load history synchronously from MMKV on `HomeScreen` mount.
    *   **Optimistic Write:** When a search completes, *immediately* add the term to the history array in React state *and* update the MMKV cache.
    *   **Background Sync:** Trigger API call to sync history with the database.
    *   **Failure:** On DB sync failure, log the error. *Decision:* Reverting history might be jarring; primary source for UI is MMKV. Ensure DB sync is robust or happens periodically.

4.  **Wine Details & Interactions (`useWineDetails`, `useWineInteractions`):**
    *   **MMKV:** Cache `Wine` object, `Offers`, `Notes[]`, `UserInteractionData` together or separately using wineId keys (e.g., `cache:wine:${wineId}`, `cache:notes:${wineId}`). Include timestamps.
    *   **Read:** In `useWineDetails`, attempt synchronous read from MMKV first. Use cached data immediately if fresh.
    *   **Stale-While-Revalidate:** Always trigger background API fetch. Update state and MMKV on successful fetch.
    *   **Optimistic UI (`useWineInteractions`):**
        *   Refactor `triggerSave` to optimistically update React state *and* the relevant interaction data within the MMKV cache for the specific wine.
        *   Store previous state (React + potentially MMKV value) before optimistic update.
        *   On API failure, revert React state *and* the MMKV cache value.

5.  **Notes (`TastingNoteScreen`, `useWineDetails`):**
    *   **MMKV (List):** Notes list cached as part of wine details (`cache:wine:${wineId}`) or separately (`cache:notes:${wineId}`).
    *   **MMKV (Draft):** In `TastingNoteScreen`, use MMKV to persist the *draft* state (`cache:noteDraft:${noteId || 'new'}:${wineId}`) synchronously on every change (debounced is fine too, but sync MMKV write is fast). This prevents data loss on crash/close.
    *   **Read Draft:** Load draft from MMKV when `TastingNoteScreen` mounts.
    *   **Optimistic Save:**
        *   Enhance `saveNoteAsync` / auto-save.
        *   Introduce `syncStatus`.
        *   Optimistically update React state and potentially clear the MMKV *draft* cache (as it's now "saved").
        *   Sync with API.
        *   On API Success: Update `syncStatus`, ensure the *list* cache (`cache:notes:${wineId}`) is invalidated/updated. Clear MMKV draft.
        *   On API Failure: Revert React state, *restore* the MMKV draft from pre-save state, set `syncStatus` to 'error', notify user.

6.  **Chat Messages (`WineDetailScreen` / `WineChatView`):**
    *   **MMKV:** Cache chat message array (`cache:chat:${wineId}`).
    *   **Read:** Load history sync from MMKV when chat view mounts.
    *   **Optimistic Send:** When user sends a message:
        *   Immediately add message to React state and append to MMKV cache (mark as 'sending' state if needed).
        *   Initiate API call.
        *   On API Success: Update message status in React state/MMKV cache (e.g., mark as 'sent', update ID if provided by backend).
        *   On API Failure: Update message status to 'failed' in React state/MMKV cache. Provide retry option.
    *   **Receive:** When new messages are received (e.g., via polling or push), update React state and append to MMKV cache.

7.  **Testing:**
    *   Verify faster initial loads using cached data.
    *   Test optimistic updates work correctly with MMKV writes.
    *   Simulate API errors to test state *and* MMKV cache rollback.
    *   Test offline behavior (reading from cache).
    *   Test cache invalidation/updates (e.g., saving note updates the list).
    *   Test clearing cache on logout.

---

## Todo List (Merged & Updated)

**Setup & Core:**
-   [x] **Install:** `yarn add react-native-mmkv` / `npm install react-native-mmkv` & pod install.
-   [x] **Create:** `cacheService.ts` (or similar) with helper functions for MMKV get/set/delete, key generation, and timestamping/TTL logic.

**Auth & Profile:**
-   [ ] **Cache:** Implement caching for user profile data in MMKV via `cacheService`.
-   [ ] **Integrate:** Load profile from cache in `AuthContext` or relevant hook, fetch/update cache on login.
-   [ ] **Clear:** Ensure profile cache is cleared on logout.

**HomeScreen (Search History):**
-   [ ] **Cache:** Use MMKV via `cacheService` to store search history.
-   [ ] **Read:** Load history synchronously on `HomeScreen` mount.
-   [ ] **Optimistic Write:** Update React state & MMKV immediately on search completion.
-   [ ] **Sync:** Implement background DB sync for history. Handle failures gracefully (log error).

**Wine Details & Interactions (`useWineDetails`, `useWineInteractions`):**
-   [x] **Cache:** Implement caching for `Wine`, `Offers`, `Notes`, `UserInteractionData` in MMKV via `cacheService`.
-   [x] **Read:** Modify `useWineDetails` to read sync from MMKV first.
-   [x] **Stale-While-Revalidate:** Ensure `useWineDetails` fetches API in background and updates state/MMKV.
-   [x] **`useWineInteractions`:** Implement state rollback on error (React state). *(Existing)*
-   [x] **`useWineInteractions`:** Store previous state before optimistic updates (React state). *(Existing)*
-   [x] **`useWineInteractions`:** **Modify** optimistic updates to *also* update/revert MMKV cache values alongside React state.

**Tasting Notes (`TastingNoteScreen`):**
-   [ ] **Cache (Draft):** Implement MMKV caching for note drafts within `TastingNoteScreen` via `cacheService`.
-   [ ] **Cache (List Invalidation):** Ensure successful note save/delete invalidates/updates the cached notes list (`cache:notes:${wineId}`).
-   [ ] **`TastingNoteScreen`:** Introduce `syncStatus` state.
-   [ ] **`TastingNoteScreen`:** Implement optimistic save (`saveNoteAsync`) updating React state, clearing MMKV draft, syncing API.
-   [ ] **`TastingNoteScreen`:** Implement state rollback (React state + restore MMKV draft) on API error.
-   [ ] **`TastingNoteScreen`:** Update UI to reflect `syncStatus`.

**Chat (`WineDetailScreen` / `WineChatView`):**
-   [ ] **Cache:** Implement caching for chat messages per wine (`cache:chat:${wineId}`) via `cacheService`.
-   [ ] **Read:** Load chat history synchronously from MMKV.
-   [ ] **Optimistic Send:** Update React state & MMKV immediately on send.
-   [ ] **Sync:** Handle API success/failure, updating message status in state/MMKV. Provide retry for failures.
-   [ ] **Receive:** Update state & append to MMKV cache on receiving messages.

**Testing:**
-   [ ] **Test:** Successful optimistic updates & MMKV writes.
-   [ ] **Test:** Faster initial loads from cache.
-   [ ] **Test:** Failure paths (network/API errors) and verify state *and* MMKV rollback/notification.
-   [ ] **Test:** Cache invalidation logic (e.g., save note updates list).
-   [ ] **Test:** Offline read scenarios.
-   [ ] **Test:** Cache clearing on logout.
-   [ ] **Test:** Rapid interaction edge cases.
