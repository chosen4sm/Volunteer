# Quick Configuration Changes

**Configuration is now in Firebase!** 🎉

No more code changes needed. Just update the `form-config/main` document in Firestore and changes take effect immediately.

## Where to Make Changes

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Firestore Database** → **form-config** → **main**
3. Edit the fields

---

## Most Common Updates

### ➕ Add New Experience

Update the `experiences` array:

```json
"experiences": [
  { "id": "construction", "label": "Construction" },
  { "id": "decor", "label": "Decor" },
  { "id": "your-id", "label": "Your Label" }
]
```

---

### ➕ Add New Team

Update the `teams` array:

```json
"teams": ["IV", "PMP", "Your Team"]
```

---

### 📅 Update Event Dates

Update both `days` and `dayDates` (MUST have same count):

```json
"days": ["Friday", "Saturday", "Sunday"],
"dayDates": ["Nov 7th", "Nov 8th", "Nov 9th"]
```

---

### ⏰ Change Shift Hours

Update the `shifts` array:

```json
"shifts": [
  "12am-6am",
  "6am-12pm",
  "12pm-6pm",
  "6pm-12am"
]
```

---

## How to See Changes

✅ **New users**: See changes immediately when they load the form  
✅ **Existing users**: See changes after they reload the page  

---

## Reference: Current Firebase Document

**Collection**: `form-config`  
**Document ID**: `main`

```json
{
  "days": ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  "dayDates": ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  "shifts": ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  "teams": ["IV", "PMP"],
  "experiences": [
    { "id": "construction", "label": "Construction" },
    { "id": "decor", "label": "Decor" }
  ]
}
```

---

## Pro Tips

✅ **No deployment needed** - Changes are instant  
✅ **Firebase Console is easiest** - Use the UI to edit  
✅ **Always sync days/dayDates** - Same number of items  
✅ **Use lowercase IDs** - e.g., `"event-setup"` not `"Event Setup"`  
✅ **Document ID is always "main"** - Don't create other docs

---

See `CONFIG_GUIDE.md` for detailed documentation.
