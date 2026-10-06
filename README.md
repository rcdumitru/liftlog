# Liftlog

A gym tracker built with **Expo + React Native**: one codebase runs as an iOS app, an Android app, and a website.

## Features

- **Workout days** (Push / Pull / Legs seeded; add, edit, reorder your own)
- **Weight logging** per set, with the last session shown next to each exercise
- **Next-weight suggestions** using double progression: hit the top of the rep range on every set → add the increment; miss most sets → drop ~10%
- **Suggested reps, sets and rest** per exercise, based on goal (strength / muscle / endurance / general) and exercise type (compound vs isolation)
- **Rest timer** that starts when you tick off a set (±15 s, skip, vibrates when done)
- **Progress**: per-exercise charts for top weight, estimated 1RM (Epley) and volume

All data is stored on the device (AsyncStorage on mobile, localStorage on web).

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go (iOS/Android)
npx expo start --web    # opens in the browser
```

## Build and deploy

```bash
npx expo export --platform web      # static website in dist/ (deploy to Netlify, Vercel, EAS Hosting…)
npx eas-cli@latest build -p ios     # App Store / TestFlight build
npx eas-cli@latest build -p android # Play Store / APK build
```

## Code map

```
src/app/(tabs)/index.tsx      Train: your days, today's scheduled day, recent sessions
src/app/(tabs)/progress.tsx   All exercises with trend
src/app/(tabs)/settings.tsx   Units, bodyweight, goal
src/app/workout/[dayId].tsx   Live workout logging + rest timer
src/app/day/[id].tsx          Edit a day's exercises, apply goal presets
src/app/exercise/[name].tsx   Per-exercise chart + history
src/lib/defaults.ts           Goal presets, seed days, progression logic
src/lib/store.ts              Tiny persisted store
```
