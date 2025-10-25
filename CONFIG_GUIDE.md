# Configuration Guide

This guide explains how to manage the volunteer form configuration, which is now stored in Firebase for easy updates without redeployment.

## Overview

All form configuration is stored in **Firebase Firestore** and fetched at runtime. This allows you to:
- Add new experiences without any code changes
- Change teams, days, and shifts instantly
- Have updates take effect immediately across all users
- Keep the dashboard in sync automatically
- Add custom experiences on-the-fly

## How It Works

1. **Configuration stored in Firebase**: `form-config/main` document in Firestore
2. **Frontend fetches on load**: Components fetch config from Firebase when they mount
3. **Caching**: Config is cached in memory to minimize Firebase calls
4. **Fallback**: If Firebase is unavailable, uses default config bundled in the code

## Initial Setup

### Step 1: Deploy Firestore Rules

Deploy the updated `firestore.rules` file:

```bash
firebase deploy --only firestore:rules
```

This adds public read access to the `form-config` collection while keeping write access restricted to admins.

### Step 2: Seed Initial Configuration

Option A: From your application's admin dashboard (if you add a button):
```typescript
import { seedFormConfig } from "@/lib/seeder";

// Call this once
await seedFormConfig();
```

Option B: Directly in Firebase Console:
1. Go to Firestore Database
2. Create a new collection called `form-config`
3. Create a document with ID: `main`
4. Add the fields (use the default config structure below)

### Step 3: Verify It Works

Navigate to the volunteer form and see if it loads the config from Firebase!

## Default Configuration Structure

```typescript
{
  days: ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  dayDates: ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  shifts: ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  teams: ["IV", "PMP"],
  experiences: [
    { id: "construction", label: "Construction" },
    { id: "decor", label: "Decor" },
  ],
}
```

## Making Changes

### To Update Configuration

#### Option 1: Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to Firestore → `form-config` → `main`
3. Edit the document directly
4. Changes take effect immediately for new users
5. Existing sessions will use cached config (reload page to refresh)

#### Option 2: Firebase CLI
```bash
firebase firestore:documents:update form-config/main --data='{"teams":["IV","PMP","Audio"]}'
```

#### Option 3: From Admin Dashboard (if implemented)
```typescript
import { updateFormConfig } from "@/lib/seeder";

await updateFormConfig({
  days: [...],
  dayDates: [...],
  shifts: [...],
  teams: ["IV", "PMP", "Audio"],
  experiences: [...]
});
```

## Common Updates

### ➕ Add New Experience

Edit the `form-config/main` document:

```typescript
experiences: [
  { id: "construction", label: "Construction" },
  { id: "decor", label: "Decor" },
  { id: "catering", label: "Catering" },  // ← Add here
]
```

### ➕ Add New Team

Edit the `form-config/main` document:

```typescript
teams: ["IV", "PMP", "Audio"]  // ← Add here
```

### 📅 Update Event Dates

Edit the `form-config/main` document:

```typescript
days: ["Friday", "Saturday", "Sunday"],
dayDates: ["Nov 7th", "Nov 8th", "Nov 9th"],  // MUST match count
```

### ⏰ Change Shift Hours

Edit the `form-config/main` document:

```typescript
shifts: [
  "12am-6am",
  "6am-12pm",
  "12pm-6pm",
  "6pm-12am",
  // Add or remove shifts
]
```

## Firestore Rules

The `firestore.rules` file includes:

```
match /form-config/{document=**} {
  allow read: if true;           // Anyone can read
  allow write: if isAdmin();     // Only admins can write
}
```

This means:
- ✅ Public can fetch configuration
- ✅ Only admins can update it
- ✅ No one can delete it (in theory)

## Caching Behavior

The frontend caches the config in memory:

```typescript
// First call: Fetches from Firebase
const config = await getFormConfig();

// Second call: Returns cached version
const config = await getFormConfig();  // Instant!
```

### Clearing Cache

When you update config in Firebase, users see the new version on:
- Page reload
- New browser session
- After calling `invalidateConfigCache()`

## File Locations

- **Config Fetching**: `/lib/config.ts`
- **Seeder Function**: `/lib/seeder.ts`
- **Form Component**: `/components/volunteer-form.tsx`
- **Dashboard**: `/components/dashboard/`
- **Rules**: `/firestore.rules`

## Troubleshooting

### Config isn't updating
- **Issue**: Browser is using cached config
- **Solution**: Reload the page or clear browser cache

### Getting "permission denied" when updating config
- **Issue**: User is not an admin
- **Solution**: Check that user has admin profile set to `true`

### Form shows default config instead of Firebase config
- **Issue**: Firestore read failed, falling back to default
- **Solution**: Check Firebase connection, ensure `form-config/main` document exists

### Changes aren't taking effect immediately
- **Issue**: Other users have cached version
- **Solution**: They need to reload the page or wait for new session

## Future Enhancements

You can extend this system to:
- Store config per event (different config for different events)
- Add validation when updating config
- Create an admin UI to edit config without Firebase console
- Add config versioning/history
- Add A/B testing with different configs
- Store team-specific configurations

## Tips

✅ **Always keep days and dayDates in sync** - same number of items  
✅ **Use lowercase with hyphens for experience IDs** - e.g., `"event-setup"`  
✅ **Label is what users see** - make it friendly!  
✅ **Firebase updates are instant** - new users see changes immediately  
✅ **Document ID must be "main"** - don't create other config docs
