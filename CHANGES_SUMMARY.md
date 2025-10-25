# Changes Summary: Configurable Form & Dashboard

## Overview

Implemented a fully configurable system where Construction and Decor are now "experiences" (not teams), and the entire form/dashboard can be easily customized without code changes.

## Key Changes

### 1. **New Configuration File** (`/lib/config.ts`)
   - Centralized FORM_CONFIG export
   - Defines: days, dayDates, shifts, teams, and experiences
   - Single source of truth for all form/dashboard elements

### 2. **Updated Volunteer Schema** (`/lib/db.ts`)
   - Added optional `experiences?: string[]` field to Volunteer interface
   - Stores array of experience IDs (e.g., ["construction", "decor"])

### 3. **Updated Form Data Interface** (`/lib/utils.ts`)
   - Added `experiences?: string[]` to VolunteerFormData
   - Supports saving experiences on form submission

### 4. **Enhanced Volunteer Form** (`/components/volunteer-form.tsx`)
   - Now imports from FORM_CONFIG instead of hardcoded arrays
   - **Added new Question 4: Experience Selection**
     - Shows "Do you have experience in the following?"
     - Multi-select checkboxes (optional)
     - Includes "Neither" option by default (no forced selection)
   - Updated question numbering (now 7 questions total):
     1. Name
     2. Phone
     3. Email  
     4. Team (required)
     5. **Experiences** (optional) ← NEW
     6. Shift Availability
     7. Review & Submit
   - Experiences included in review section
   - Experiences saved with volunteer submission

### 5. **Updated Dashboard** 
   - **assignments-tab.tsx**: Uses FORM_CONFIG for days/shifts
   - **overview-tab.tsx**: Uses FORM_CONFIG for days/shifts
   - Both dashboards automatically synced with form config

## What Changed Structurally

### Before
```typescript
// Hardcoded in components
const TEAMS = ["IV", "PMP", "Construction", "Decor"];
const DAYS = ["Friday", ...];
const SHIFTS = ["12am-6am", ...];
// Construction/Decor were teams, no experience field
```

### After
```typescript
// /lib/config.ts (single source of truth)
export const FORM_CONFIG = {
  teams: ["IV", "PMP"],  // Teams only
  experiences: [
    { id: "construction", label: "Construction" },  // Separate
    { id: "decor", label: "Decor" },
  ],
  days: ["Friday", ...],
  dayDates: ["November 7th", ...],
  shifts: ["12am-6am", ...],
};

// Used everywhere
import { FORM_CONFIG } from "@/lib/config";
const DAYS = FORM_CONFIG.days;
```

## Database Impact

### Volunteer Document Structure (Before)
```javascript
{
  name: "John",
  email: "john@example.com",
  phone: "123-456-7890",
  team: "Construction",  // Could be team or experience
  shifts: { ... }
}
```

### Volunteer Document Structure (After)
```javascript
{
  name: "John",
  email: "john@example.com",
  phone: "123-456-7890",
  team: "IV",  // Only actual teams
  experiences: ["construction", "decor"],  // New field
  shifts: { ... }
}
```

## How to Extend

### Add New Experience
1. Edit `/lib/config.ts`
2. Add to experiences array:
   ```typescript
   { id: "catering", label: "Catering" }
   ```
3. Done! Form and dashboard update automatically

### Add New Team
1. Edit `/lib/config.ts`
2. Add to teams array:
   ```typescript
   teams: ["IV", "PMP", "Audio"]
   ```

### Change Days/Shifts
1. Edit `/lib/config.ts`
2. Update days, dayDates, and shifts arrays
3. Dashboard and form automatically use new values

### Add More Questions
- Edit form component and add new question state
- Follow existing pattern with AnimatePresence
- Update question counter logic

## Files Modified

1. **lib/config.ts** - Created ✨
2. **lib/db.ts** - Updated Volunteer interface
3. **lib/utils.ts** - Updated VolunteerFormData interface
4. **components/volunteer-form.tsx** - Added experiences Q4, updated flow
5. **components/dashboard/assignments-tab.tsx** - Uses FORM_CONFIG
6. **components/dashboard/overview-tab.tsx** - Uses FORM_CONFIG

## Files Created

1. **CONFIG_GUIDE.md** - Detailed configuration guide
2. **CHANGES_SUMMARY.md** - This file

## Testing

Run the form:
- ✅ Navigate to /
- ✅ Go through all 7 questions
- ✅ Verify Experience question shows checkboxes
- ✅ Verify can select multiple experiences
- ✅ Verify can skip experiences (optional)
- ✅ Verify experiences show in review
- ✅ Verify submission includes experiences

Run the dashboard:
- ✅ Navigate to /dashboard
- ✅ Verify volunteers show with experiences field
- ✅ Verify filtering works with new config
- ✅ Verify assignments work as before

## Migration Notes

### For Existing Data
Existing volunteers in Firebase may not have the `experiences` field. This is fine because:
- Field is optional (`experiences?: string[]`)
- Code handles missing field with nullish coalescing
- Old records continue to work

When old volunteers re-submit, their experiences will be saved.

### Frontend
- No breaking changes to existing UI
- New Experience question is optional
- All other questions work the same

## Future Enhancements

The system is now ready for:
- Database-driven configuration
- Admin panel to edit teams/experiences without deploying
- Per-event configuration
- Experience-based scheduling/assignments
- Bulk operations on volunteers by experience

## Version Info

- TypeScript: Fully typed
- Build: ✅ Passes `next build`
- Linting: ✅ No errors
- Backward compatible: ✅ Yes
