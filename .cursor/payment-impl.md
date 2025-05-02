3.  **Subscription State Management (Zustand):**
    *   Create a Zustand store slice to hold the user's subscription status (`tier`, `status`, `isLoading`).
    *   Fetch the status using the backend's `/subscriptions/status` endpoint after login/app load and update the store.
4.  **UI Components:**
    *   **Pricing/Upgrade Screen:** Display subscription tiers, features, and prices. Include an "Upgrade" button.
    *   **Profile/Settings Screen:** Show the user's current subscription tier and status. Include a "Manage Subscription" button.
    *   **Feature Gating Components:** Create higher-order components or hooks (e.g., `withSubscriptionCheck`, `useSubscriptionStatus`) to wrap premium features. These checks read the status from the Zustand store.
    *   **Upgrade Prompts:** Display modals or banners prompting users to upgrade when they try to access a gated feature without the required subscription tier.
5.  **Checkout Flow:**
    *   When the user clicks "Upgrade":
        *   Call the backend (`POST /subscriptions/create-checkout-session`) to get a Stripe Checkout session ID.
        *   Use `@stripe/stripe-react-native`'s `redirectToCheckout` (for web-based checkout) or integrate Payment Sheet for a more native feel (requires more backend setup with PaymentIntents). `redirectToCheckout` is simpler to start.
        *   Handle the result of the checkout process. Stripe webhooks will update the backend, and the frontend state should eventually reflect the change after re-fetching the status.
6.  **Customer Portal Flow:**
    *   When the user clicks "Manage Subscription":
        *   Call the backend (`POST /subscriptions/create-portal-session`) to get a Stripe Customer Portal URL.
        *   Open this URL in the user's web browser (e.g., using `expo-web-browser`).
7.  **Clerk/Supabase User ID:** Ensure you consistently use the authenticated user's ID (obtainable from Clerk's context/hooks) when making backend calls related to subscriptions.

**Phase 3: Testing & Refinement**

1.  **Webhook Testing:** Use the Stripe CLI or tools like ngrok to test webhook handling locally. Test various event types (success, failure, cancellation).
2.  **Frontend Flow Testing:** Test the upgrade, management, and feature gating flows thoroughly on both iOS and Android simulators/devices.
3.  **Error Handling:** Implement robust error handling on both frontend and backend (e.g., Stripe API errors, network issues, invalid states).

This plan provides a structured approach. We can start by setting up the database and backend endpoints. Would you like to begin with updating the database schema and creating the FastAPI endpoints structure?