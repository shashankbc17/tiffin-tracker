# TiffinFlow - Project Architecture & Context

## Project Overview
**TiffinFlow** is an iOS-styled Progressive Web Application (PWA) built for tracking daily breakfast and lunch subscriptions, handling carry-overs when cook/user skips a day, computing per-person expenses, and syncing across devices via Google Sign-In and Cloud Firestore.

## Tech Stack
- **Architecture Pattern:** Static SPA optimized for GitHub Pages + PWA iOS Safari installability
- **Frontend Stack:** React 18, TypeScript, Vite, Lucide React, Canvas Confetti
- **Styling:** Custom iOS 18 Design System (`ios-theme.css`) with Apple SF Pro typography, Cupertino segmented controls, safe-area notches, and frosted glass
- **Data Engine:**
  - `carryOverEngine.ts`: Calculates consumed portions, skipped meals, dynamic package end-date extensions, and WhatsApp statements
  - `storage.ts`: Instant LocalStorage caching with Firestore multi-device synchronization
  - `firebase.ts`: Google Auth popup + Firestore collections isolated per user (`users/{uid}`)

## Directory Structure
```
tiffin-tracker/
├── .github/workflows/deploy.yml
├── index.html
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── services/
│   │   ├── carryOverEngine.ts
│   │   ├── firebase.ts
│   │   └── storage.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── IosHeader.tsx
│   │   │   └── IosTabBar.tsx
│   │   ├── today/
│   │   │   └── TodayQuickLogger.tsx
│   │   ├── calendar/
│   │   │   ├── MealCalendar.tsx
│   │   │   └── DayDetailModal.tsx
│   │   ├── package/
│   │   │   ├── PackageSummaryCard.tsx
│   │   │   └── NewPackageModal.tsx
│   │   ├── analytics/
│   │   │   └── ExpenseBreakdown.tsx
│   │   └── settings/
│   │       └── SettingsView.tsx
│   └── styles/
│       └── ios-theme.css
```

## Testing & Verification Policy
- **DO NOT** run tests, automated test runners, or browser verification subagents unless the user explicitly requests them.
- The user will check and verify all fixes manually.

## Deployment & Verification Rule (MANDATORY)
- **ALWAYS push all changes to GitHub Pages** (`git push origin main` and/or `npm run deploy`) so the user can verify changes live on GitHub Pages.

