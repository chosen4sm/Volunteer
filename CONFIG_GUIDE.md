# Configuration Guide

This guide explains how to add or modify form questions, experiences, teams, shifts, and days in the volunteer system.

## Overview

All form configuration is centralized in `/lib/config.ts`. This allows you to:
- Add new experiences without touching form code
- Change teams, days, and shifts
- Keep the dashboard in sync automatically
- Add custom experiences in the future

## File Location

Configuration file: `/lib/config.ts`

```typescript
export const FORM_CONFIG = {
  days: ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  dayDates: ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  shifts: ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  teams: ["IV", "PMP"],
  experiences: [
    { id: "construction", label: "Construction" },
    { id: "decor", label: "Decor" },
  ],
};
```

## Adding New Experiences

To add a new experience (e.g., "Catering"), add it to the `experiences` array:

```typescript
experiences: [
  { id: "construction", label: "Construction" },
  { id: "decor", label: "Decor" },
  { id: "catering", label: "Catering" },  // New experience
],
```

**That's it!** The new experience will automatically appear:
- In the volunteer form (Question 4)
- When filtering/searching in the dashboard
- In the volunteer details and review section

## Adding New Teams

To add a new team (e.g., "Audio"), add it to the `teams` array:

```typescript
teams: ["IV", "PMP", "Audio"],  // New team
```

The new team will appear in the volunteer form (Question 3) and in the dashboard.

## Changing Days/Dates

To change the event days, update both `days` and `dayDates`:

```typescript
days: ["Thursday", "Friday", "Saturday"],
dayDates: ["November 6th", "November 7th", "November 8th"],
```

**Important:** Keep the arrays in sync—same number of items, matching order.

## Changing Shifts

To add or modify shifts:

```typescript
shifts: ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am", "12am-12pm"],
```

Shifts are used for:
- Availability selection in the form
- Filtering in the dashboard
- Shift validation (prevents consecutive shifts without breaks)

## Where Configuration is Used

### Volunteer Form (`/components/volunteer-form.tsx`)
- **Question 1:** Days for shift selection (uses `days` and `dayDates`)
- **Question 2:** Teams (uses `teams`)
- **Question 3:** Experiences (uses `experiences`)
- **Shift availability:** Uses `shifts`

### Dashboard Components
- **Overview Tab:** Shows volunteer availability by day/shift
- **Assignments Tab:** Filters volunteers by day/shift

### Database
The `Volunteer` schema in `/lib/db.ts` includes:
- `team`: string (selected team)
- `experiences`: string[] (array of experience IDs from config)
- `shifts`: Record<string, string[]> (availability by day)

## Example: Adding a New Experience

1. Open `/lib/config.ts`
2. Add to the `experiences` array:
   ```typescript
   { id: "setup", label: "Event Setup" }
   ```
3. Save the file
4. The volunteer form will show the new option immediately

## Form Flow

The volunteer form now has 7 questions:

1. **Full Name** - Required
2. **Phone Number** - Required
3. **Email** - Required
4. **Team Selection** - Required (Question 3 in UI)
5. **Experience Selection** - Optional (Question 4 in UI)
6. **Shift Availability** - Multiple questions, one per day (Questions 5+ in UI)
7. **Review** - Summary before submission

## Data Storage

When a volunteer submits:
```typescript
{
  name: "John Doe",
  phone: "123-456-7890",
  email: "john@example.com",
  team: "IV",
  experiences: ["construction", "decor"],  // Array of experience IDs
  shifts: {
    Friday: ["12pm-6pm", "6pm-12am"],
    Saturday: ["12am-6am"],
    // ... etc
  }
}
```

## Tips

- **Always keep days and dayDates in sync** - same length, matching order
- **Use consistent IDs for experiences** - lowercase, no spaces (e.g., "construction" not "Construction")
- **Update dates before deployment** - the `dayDates` are user-facing text
- **Test the form** after config changes to ensure UI updates correctly

## Making it More Configurable

In the future, you can:
- Load config from a database
- Create an admin panel to edit config without code changes
- Store config per event (different experiences for different events)

For now, all configuration is managed through this single file.
