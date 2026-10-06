# Liftlog

A gym tracker for logging your sets and weights and following your progress over time. Built with Expo + React Native, so one codebase runs as an iOS app, an Android app and a website.

All data stays on the device. There are no accounts, no backend and no network requests.

## Features

### Train
- **Workout days.** Push, Pull and Legs are included to start with. You can add, edit and delete days and reorder their exercises.
- **Day editor.** Set each exercise's muscle group, type (compound, isolation, bodyweight or cardio), sets, rep range, rest and weight increment. Goal presets (Strength, Muscle, Endurance, General) fill in recommended sets, reps and rest.
- **Recent workouts.** Shows the date and how long each workout took. Tap one to see every exercise and set, with duration, sets and volume, or to delete it.

### Logging a workout
- **Tap a day to open it.** Each set shows what you did on that set last time, under **Previous**.
- **Log what you actually did.** After each set, enter the weight and reps, then tick it. If you leave the fields empty, ticking logs the same as last time.
- **Just looking doesn't count.** If you leave without ticking a set, nothing is saved. Once a set is ticked, the workout stays in progress until you finish or discard it.
- **Adjust as you go.** Add or remove sets. Tap the sets × reps tag to change the rep range, which is saved to the day for next time.
- **Next-weight suggestions** use double progression. If you hit the top of the rep range on every set, the app suggests adding the increment. If you miss most sets, it suggests dropping about 10%. You can turn this off in Settings.
- **Rest timer.** It starts when you tick a set, and has −15 s, +15 s and Skip buttons.
  - When the rest is over, a popup appears if the app is open.
  - If the app is in the background, you get a notification instead (iOS and Android only).
- A **?** button explains the logging flow.

### Progress
- **Period filter.** Week, Month, 3 months, Year or All time. It controls the workout and exercise counts, which exercises are listed, and each card's trend ("+5 kg over 12 sessions").
- **Grouping.** List exercises **by day** or **by group**, meaning muscle group (Chest, Shoulders, Back, Arms, Legs, Core).
- **Search.** Matches update as you type.
- **Exercise detail screen:**
  - A bar chart of top weight or volume for the last 16 sessions. Hover over a bar (web) or tap it (phone) to see its date and value.
  - Your all-time heaviest set.
  - The full set history, which you can filter by period and sort newest or oldest first.

### Settings
- **Units:** kg or lb. This changes the labels only; existing numbers aren't converted.
- **Main goal:** the default preset in the day editor.
- **Appearance:** dark or light theme, plus an accent color (Lime, Blue, Orange, Pink, Purple).
- **Weight suggestions:** show or hide them.
- **Data:** delete your workout history (days and settings are kept), or reset everything.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go (iOS/Android)
npx expo start --web    # opens in the browser
```

If the bundler reports a module it can't resolve after installing packages, restart it with a clean cache:

```bash
npx expo start -c
```

Add packages with `npx expo install <package>`, so the versions match the Expo SDK.

## Checks

```bash
npx tsc --noEmit        # typecheck
```

## Build and deploy

```bash
npx expo export --platform web       # static website in dist/ (Netlify, Vercel, EAS Hosting…)
npx eas-cli@latest build -p ios      # App Store / TestFlight build
npx eas-cli@latest build -p android  # Play Store / APK build
```

## How data is stored

The app's state is held in memory: days, workouts, the workout in progress, and settings. Every change saves it as one JSON object under the key `liftlog:v1` in [AsyncStorage](https://react-native-async-storage.github.io/async-storage/). On the web that is the browser's `localStorage`.

Each device and browser keeps its own copy, and nothing is synced between them. Sample workouts have ids starting with `sample-`, so they can be removed on their own.

## Code map

```
src/app/_layout.tsx            Root stack, theme-aware header, rest timer bar
src/app/(tabs)/_layout.tsx     Tab bar: Train, Progress, Settings
src/app/(tabs)/index.tsx       Train: days, in-progress workout, recent workouts
src/app/(tabs)/progress.tsx    Period stats, search, exercises grouped by day or muscle
src/app/(tabs)/settings.tsx    Units, goal, appearance, suggestions, data, developer tools
src/app/workout/[dayId].tsx    Logging a workout: previous sets, rep range editing, help sheet
src/app/day/[id].tsx           Day editor with goal presets
src/app/exercise/[name].tsx    Per-exercise chart and history
src/app/session/[id].tsx       A finished workout's details, delete

src/components/ui.tsx          Shared UI pieces (Screen, Card, Button, Chip, inputs…)
src/components/RestTimer.tsx   Rest countdown, "next set" popup
src/lib/store.ts               Persisted store and actions
src/lib/types.ts               Data model
src/lib/defaults.ts            Goal presets, seed days, progression, muscle groups, periods, formatting
src/lib/stats.ts               Per-exercise history (top weight, volume)
src/lib/theme.ts               Dark/light palettes, accent colors, live theme switching
src/lib/notify.ts              Rest-over notification (expo-notifications)
src/lib/sampleData.ts          Sample workout generator for testing
src/lib/confirm.ts             Cross-platform confirm dialog
```
