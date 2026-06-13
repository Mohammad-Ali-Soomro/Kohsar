# Kohsar (کوہسار)

Kohsar is a community-driven hidden spots discovery application for Balochistan, Pakistan. It allows local explorers and tourists to discover, bookmark, and share natural wonders, historic locations, and scenic viewpoints across the region.

The application combines a bold Neo-Brutalist design aesthetic with traditional Balochi geometric embroidery patterns to deliver a unique and premium user experience.

---

## Key Features

* **Authentication and Guest Mode**: Secure passwordless Email OTP verification. Users can also choose to explore the app as a guest with standard view-only permissions.
* **Onboarding Screen**: A 3-slide visual onboarding introduction explaining the app's mission with custom vector illustration grids.
* **Interactive Map**: Custom styled map showing Balochistan in a warm, sandy theme. Features a fallback to OpenStreetMap (OSM) on Android if Google Maps API keys are missing. Includes marker clustering and a slide-up details sheet for selected spots.
* **Multi-Step Submit Spot Wizard**:
  * Upload 1 to 3 photos with automatic compression.
  * Drag-to-reorder photo strip.
  * Geofenced location picker restricted to coordinates inside Balochistan.
  * Real-time duplicate checking (warns if a spot is registered within 100 meters).
  * Auto-saved drafts in case of disconnection.
* **Explorer Profile and Badges**: Track submitted spots, checked-in visits, and unique explorer badges awarded to the first user who discovers and logs a spot.
* **Smart Search Screen**: Quick discovery via category grids, top cities, search history, and debounced fuzzy searches with paginated results.
* **Offline Caching and Sync Queue**:
  * Feeds, map pins, and saves are cached locally.
  * Offline actions (like saves and visits) are queued and automatically synchronized when the internet connection is restored.
  * Persistent amber warning banner visible when offline.
* **Safety and Rate Limits**: Anti-spam limits (maximum 5 submissions per 24 hours) and automatic hiding of spots that accumulate 5 or more reports.

---

## Technical Stack

* **Core Engine**: React Native (0.81.5), Expo SDK 54, TypeScript
* **Navigation**: React Navigation (Native Stack, Bottom Tabs)
* **Animations & Styling**: React Native Reanimated (4.1.1), Expo Image, React Native SVG, Expo Haptics
* **Backend Platform**: Supabase JS (auth and database client)
* **Local Storage**: AsyncStorage, React Native NetInfo
* **Database Engine**: PostgreSQL with PostGIS extension (for geofenced geometry points and distance computations)

---

## Getting Started

### 1. Prerequisites
Make sure you have Node.js installed on your machine. You will also need the Expo Go application installed on your physical device.

### 2. Setup Environment Variables
Create a `.env` file in the root directory and specify your Supabase credentials and maps keys:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Database Migration
Run the SQL script located in `supabase/db-schema.sql` inside your Supabase SQL Editor. This will set up:
* The tables for profiles, spots, saves, visits, spot photos, badges, and reports.
* Row Level Security (RLS) rules.
* Storage buckets (`avatars` and `spot-photos`).
* Database functions for checking nearby duplicates (`check_duplicate_spot`), fetching nearby spots (`get_nearby_spots`), and enforcing rate limits.

### 4. Install Dependencies
Run the installation command in your terminal:

```bash
npm install
```

### 5. Start the Application
Run Expo with the clean cache flag:

```bash
npx expo start -c
```

Scan the QR code printed in the terminal using your phone's camera (iOS) or the Expo Go app (Android).

---

## File Structure

* `App.tsx`: App initialization, font loading, splash screen management, and global layout providers.
* `index.ts`: Application entry point setting up polyfills and registering the root component.
* `src/constants/theme.ts`: Base design tokens including Neo-Brutalist colors, borders, and typography scales.
* `src/stores/`: Zustand stores managing state for auth, spots, UI messages, and coordinates.
* `src/lib/`: Unified configurations (Supabase connection, offline cache interface, validation methods).
* `src/components/`: Reusable Brutalist elements (KCard, KButton, KInput, KToast) and map assets.
* `src/screens/`: Screen views grouped by Onboarding, Auth, and Main application modules.
