# Deployment Guide: Firebase Configuration

This guide walks through deploying the Firebase-driven configuration system.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project initialized in this directory
- Admin access to Firebase Console

## Step 1: Deploy Firestore Security Rules

Run this command to update the security rules:

```bash
firebase deploy --only firestore:rules
```

This allows:
- ✅ Anyone to read the form configuration
- ✅ Only admins to write/update the configuration

## Step 2: Initialize Configuration in Firebase

Choose **ONE** of these options:

### Option A: Via Firebase Console (Easiest) 🎯

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Click **Create Collection**
   - Collection ID: `form-config`
   - Click **Next**
5. Create a Document
   - Document ID: `main`
   - Click **Auto ID** or type `main`, then **Save**
6. Add the following fields:

   ```
   Field Name      Type        Value
   ─────────────────────────────────────────
   days            Array       ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"]
   dayDates        Array       ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"]
   shifts          Array       ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"]
   teams           Array       ["IV", "PMP"]
   experiences     Array       (see below)
   ```

   For the `experiences` array, add as type "Array":
   ```
   {
     "id": "construction",
     "label": "Construction"
   },
   {
     "id": "decor",
     "label": "Decor"
   }
   ```

### Option B: Via Seeder Function

From your admin dashboard or a temporary script:

```typescript
import { seedFormConfig } from "@/lib/seeder";

// Call this once
try {
  const result = await seedFormConfig();
  console.log(result.message); // "Form config seeded to Firebase"
} catch (error) {
  console.error("Error:", error);
}
```

### Option C: Via Firebase CLI

```bash
firebase firestore:documents:set form-config/main --data='{
  "days": ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  "dayDates": ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  "shifts": ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  "teams": ["IV", "PMP"],
  "experiences": [
    {"id": "construction", "label": "Construction"},
    {"id": "decor", "label": "Decor"}
  ]
}'
```

## Step 3: Deploy Application

Deploy your Next.js application (method depends on your hosting):

**If using Firebase Hosting:**
```bash
firebase deploy --only hosting
```

**If using Vercel:**
```bash
vercel deploy --prod
```

**If using another service, follow their deployment process.**

## Step 4: Verify Deployment

1. Navigate to your volunteer form at `/`
2. The form should load normally
3. Check browser console for any errors
4. Go through all 7 questions to verify experiences show

### Debugging

If the form shows **default config** instead of **Firebase config**:

1. Check browser console (F12 → Console tab)
2. Look for errors like "Error fetching form config from Firebase"
3. Verify:
   - Firestore rules are deployed: `firebase deploy --only firestore:rules`
   - `form-config/main` document exists in Firestore
   - Firebase connection is working

## Making Changes After Deployment

Once deployed, you can update configuration WITHOUT redeploying:

### Quick Update in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Firestore → `form-config` → `main`
3. Edit any field
4. Changes take effect for new users immediately
5. Existing users see changes after page reload

### Example: Add New Team

1. In Firebase Console, edit the `teams` field
2. Add `"Audio"` to the array: `["IV", "PMP", "Audio"]`
3. Click **Update**
4. ✅ All new visitors see "Audio" as a team option

### Example: Add New Experience

1. In Firebase Console, edit the `experiences` field (Array)
2. Add new object:
   ```json
   {
     "id": "catering",
     "label": "Catering"
   }
   ```
3. Click **Update**
4. ✅ All new visitors see "Catering" as an option

## Troubleshooting

### "Permission denied" error when updating config

**Cause:** User is not an admin

**Solution:** 
1. Ensure user has admin profile set to `admin: true`
2. Use Firebase Console directly (doesn't require code)

### Form shows default config, not Firebase config

**Cause:** Firebase read failed

**Solution:**
1. Check that `form-config/main` exists in Firestore
2. Verify security rules deployed: `firebase deploy --only firestore:rules`
3. Check browser console for specific error message

### Changes aren't showing up

**Cause:** Browser/user has cached old config

**Solution:**
- New users will see changes immediately
- Existing users need to reload page
- For programmatic refresh: `invalidateConfigCache()`

## Rollback / Reset Configuration

If something goes wrong:

1. Open Firebase Console
2. Go to Firestore → `form-config` → `main`
3. Delete the document
4. Re-seed with Option A, B, or C above

The app will use the hardcoded default config while Firebase config is missing.

## Summary

✅ Deploy Firestore rules: `firebase deploy --only firestore:rules`  
✅ Initialize config in Firebase (Console, CLI, or seeder)  
✅ Deploy application (Firebase Hosting, Vercel, etc.)  
✅ Test by visiting the volunteer form  
✅ Update config anytime via Firebase Console (no redeployment!)

## Next Steps

- Monitor your form submissions
- Update experiences/teams as needed
- Consider adding an admin dashboard UI for easier config management
- Set up monitoring for config access

Done! 🎉
