# Quick Configuration Changes

## Most Common Updates

### ➕ Add New Experience
**File:** `/lib/config.ts`

```typescript
experiences: [
  { id: "construction", label: "Construction" },
  { id: "decor", label: "Decor" },
  { id: "your-id", label: "Your Label" },  // ← Add here
],
```

---

### ➕ Add New Team
**File:** `/lib/config.ts`

```typescript
teams: ["IV", "PMP", "Your Team"],  // ← Add here
```

---

### 📅 Update Event Dates
**File:** `/lib/config.ts`

```typescript
days: ["Friday", "Saturday", "Sunday"],  // ← Update days
dayDates: ["Nov 7th", "Nov 8th", "Nov 9th"],  // ← Update dates (MUST match count)
```

---

### ⏰ Change Shift Hours
**File:** `/lib/config.ts`

```typescript
shifts: [
  "12am-6am",
  "6am-12pm",
  "12pm-6pm",
  "6pm-12am",
  // Add or remove shifts here
],
```

---

## How to Test Your Changes

1. **Form page:** Navigate to `/` and go through all questions
2. **Dashboard:** Navigate to `/dashboard` to see volunteers

Both should reflect your config changes immediately.

---

## Pro Tips

✅ **Always keep days and dayDates in sync** - same number of items  
✅ **Use lowercase with hyphens for experience IDs** - e.g., `"event-setup"` not `"Event Setup"`  
✅ **Label is what users see** - make it friendly!  
✅ **Changes take effect immediately** - no rebuild needed in dev mode

---

## Reference: Current Config

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

---

See `CONFIG_GUIDE.md` for more detailed information.
