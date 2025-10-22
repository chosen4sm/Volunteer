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
- Validate all required fields (firstName, lastName, phone, email, shifts, submittedAt)
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
1. Collect personal information (First Name, Last Name, Phone, Email)
2. Allow selection of availability for November 7-10
3. Track selected shifts (Day Time and Over Night) for each day
4. Validate all data before submission
5. Submit to Firestore `volunteers` collection with timestamp

## Data Structure

Each volunteer submission creates a document with:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1 (555) 123-4567",
  "email": "john@example.com",
  "shifts": {
    "Friday": ["Day Time"],
    "Saturday": ["Day Time", "Over Night"],
    "Sunday": [],
    "Monday": ["Over Night"]
  },
  "submittedAt": "2024-11-07T10:00:00Z"
}
```
