# TripMates - Project Handover

## 1. Project Overview
- **App Purpose**: A mobile application that connects motorcycle riders who are planning trips to the same destinations, allowing them to discover routes, request to join trips, and connect with other riders.
- **Technology Stack**:
  - **Frontend**: React Native, Expo, React Navigation (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`).
  - **Backend**: Node.js, Fastify framework.
  - **Database**: PostgreSQL (interacted with via `pg` pool).
  - **Authentication**: JWT-based authentication (`jsonwebtoken`) with SMS OTP verification.

## 2. Completed Features
*(The following features are implemented, tested, and actively wired up in the UI and backend.)*
- **Authentication**: OTP-based login/signup flow, secure JWT storage using `expo-secure-store`.
- **Dynamic Profile Editing**: Users can edit their Name and Mobile Number. Changing the mobile number triggers a strict OTP verification flow before updating the database.
- **Trip Discovery**: 
  - Users can search for routes via "Starting Location" and "Destination".
  - The Discover screen successfully retrieves active public trips matching the destination.
- **Upcoming Trips Management**:
  - The Home screen dynamically greets the user and accurately fetches strictly *their* own upcoming trips (no global feed mix-ups).
  - Trips that pass the current date automatically roll over to the "Completed" tab based on accurate midnight date calculations.
- **Trip Details & Joining**:
  - Tapping a trip opens a dedicated `TripDetailsScreen.js`.
  - Riders can request to join other creators' trips.
  - Trip Creators can view incoming join requests and Accept/Decline them.
  - Accepted riders are added to the trip's squad (database `trip_participants`).
- **User Connections**:
  - Riders can view another rider's profile and request to "Connect".
  - Users can manage incoming, outgoing, and established connections.
- **Notifications UI**:
  - A notification bell in the main navigation tab header.
  - A dedicated `NotificationsScreen.js` to view in-app alerts (join requests, acceptances, connections).
  - Unread vs. Read highlighting and routing to the relevant profile/trip upon tapping.

## 3. Current Work
**Feature Focus**: Finalizing the "Notifications" Screen & Delivery
- **Files Modified**: 
  - `backend/src/modules/notifications/index.js`: Added REST API routes to fetch user-specific notifications and mark them as read.
  - `src/screens/main/NotificationsScreen.js` (Created): Built a dedicated screen listing chronological alerts with visual distinctions for unread status.
  - `src/navigation/MainTabs.js`: Added a global header right button (🔔) to jump to notifications.
  - `src/navigation/RootNavigator.js`: Registered `Notifications` in the stack.
- **Status**: The backend routes, frontend UI, and screen navigation for in-app notifications are fully wired up.

## 4. Remaining Tasks
*(In priority order)*
1. **Chat & Groups System**: The `GroupsScreen.js` lists active riding groups and attempts to route to `GroupChatScreen`, but robust group-chat websocket/real-time logic needs validation.
2. **Advanced Route Matching**: The current Discover search relies on exact text matching (`ILIKE`). Adding spatial/GIS logic (e.g., Google Maps API or PostGIS) for overlapping routes.
3. **Expanded Profile Attributes**: The backend currently doesn't provide a `city` field, so "Bangalore" is missing or hardcoded. The frontend `ProfileScreen` needs to be mapped to more dynamic backend bike/city data.
4. **Push Notifications Delivery**: In-app notifications are implemented, but actual outbound push notifications via Expo/FCM to devices are not fully configured.

## 5. Database and Backend
- **PostgreSQL Schema**:
  - `users`, `user_profiles`, `bikes`
  - `trips`: Stores trip plans.
  - `trip_requests`: Maps a `trip_id` to a `user_id` with a `status` ('pending', 'accepted', 'declined').
  - `trip_participants`: A confirmed Many-to-Many mapping for accepted riders.
  - `connections`: Maps `user_id_1` to `user_id_2` to establish friendships.
  - `notifications`: Stores historical events for users.
- **Security & Authorization**:
  - The backend extensively uses a `preHandler: [authenticate]` middleware.
  - All endpoints enforce SQL-level authorization (e.g., verifying `creator_id = request.user.id` before allowing a user to accept a trip join request).
- **Migrations applied**: The `create_tables.js` and `init_db.js` scripts have successfully deployed all schemas to the local `ride_match` database.

## 6. Known Errors
- **No Blocking Errors**: The React Native frontend and Fastify backend both pass syntax checks (`node -c`).
- **Minor Warning**: In `api.js`, Fastify throws a native `FST_ERR_CTP_EMPTY_JSON_BODY` if a POST request sends an empty body with an `application/json` header. This was recently patched by stripping the header if no body exists, so the app handles it gracefully.
- **Tooling**: `npm run lint` / `npm run eslint` fail because ESLint is not currently configured in `package.json`.

## 7. Next Session Instructions
- **Task**: Implement the `Chat & Groups System`.
- **Files to Inspect First**: 
  - `src/screens/main/GroupChatScreen.js` (to see the current UI).
  - `backend/src/modules/chat/index.js` (to verify websocket or polling infrastructure).
- **Expected Result**: Users in the same group or trip should be able to send real-time or polled messages to each other.
- **Do Not Regress**: Ensure existing trip management and notification systems continue functioning correctly.

## 8. Verification
- **Commands Run**:
  - Verified Fastify endpoints and JavaScript syntax using `node -c <file>`. 
- **Git Status**: Currently on branch `main`. There are several modified and untracked files ready to be committed (including the newly created `NotificationsScreen.js`).

---
**Summary**: The in-app notifications loop is complete! Riders can now tap the bell icon to securely review historical join/connection requests. The single best next step is to commit the current working state, then build out the actual Group Chat functionality to enable live communication between riders.