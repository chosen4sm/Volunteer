# Firebase Setup Guide

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables (get these from your Firebase Console):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

## Firestore Security Rules Deployment

### Step 1: Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### Step 2: Initialize Firebase in your project
```bash
firebase init
```
Select "Firestore" and "Firestore Rules"

### Step 3: Update Firestore Rules
The `firestore.rules` file has already been configured to:
- Allow anonymous writes to the `volunteers` collection
- Validate all required fields (name, phone, email, team, shifts, submittedAt)
- Allow authenticated users to read, update, and delete

### Step 4: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Step 5: Deploy Firestore Indexes (if needed)
```bash
firebase deploy --only firestore:indexes
```

## Form Submission

The volunteer form will:
1. Collect personal information (Full Name, Phone, Email)
2. Select team (IV or PMP)
3. Allow selection of availability for November 7-11
4. Track selected shifts (6-hour shifts) for each day
5. Validate all data before submission
6. Submit to Firestore `volunteers` collection with timestamp

## Data Structure

Each volunteer submission creates a document with:
```json
{
  "name": "John Doe",
  "phone": "555-123-4567",
  "email": "john@example.com",
  "team": "IV",
  "shifts": {
    "Friday": ["6am-12pm", "12pm-6pm"],
    "Saturday": ["12am-6am"],
    "Sunday": [],
    "Monday": ["6pm-12am"],
    "Tuesday": []
  },
  "submittedAt": "2024-11-07T10:00:00Z"
}
```
