import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizePhone } from "./utils";

export interface CheckInRecord {
  assignmentId: string;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  materialsIssued?: { [key: string]: boolean };
  materialsReturned?: { [key: string]: boolean };
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  uniqueCode?: string;
  role?: "volunteer" | "lead";
  leadTaskIds?: string[];
  experiences?: string[];
  ageRange?: string[];
  jamatKhane?: string[];
  specialSkill?: string;
  shifts: { [key: string]: string[] };
  checkIns?: CheckInRecord[];
  submittedAt: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  locationId?: string;
  name: string;
  description?: string;
  materials?: string[];
  createdAt: Timestamp;
}

export interface Assignment {
  id: string;
  volunteerId: string;
  locationId?: string;
  taskId: string;
  shift?: string;
  day?: string;
  description?: string;
  status?: "pending" | "checked-in" | "completed";
  createdAt: Timestamp;
}

export async function getVolunteers(): Promise<Volunteer[]> {
  const q = query(collection(db, "volunteers"), orderBy("submittedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Volunteer));
}

export async function getVolunteer(id: string): Promise<Volunteer | null> {
  const docRef = doc(db, "volunteers", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Volunteer;
  }
  return null;
}

export async function getVolunteerByEmail(email: string): Promise<Volunteer | null> {
  const q = query(collection(db, "volunteers"), where("email", "==", email.toLowerCase().trim()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Volunteer;
  }
  return null;
}

export async function getVolunteerByPhone(phone: string): Promise<Volunteer | null> {
  const normalizedPhone = normalizePhone(phone);
  const q = query(collection(db, "volunteers"));
  const snapshot = await getDocs(q);
  
  for (const doc of snapshot.docs) {
    const volunteerPhone = doc.data().phone;
    if (normalizePhone(volunteerPhone) === normalizedPhone) {
      return { id: doc.id, ...doc.data() } as Volunteer;
    }
  }
  return null;
}

export async function getVolunteerByCode(code: string): Promise<Volunteer | null> {
  const q = query(collection(db, "volunteers"), where("uniqueCode", "==", code));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Volunteer;
  }
  return null;
}

export async function updateVolunteer(id: string, data: Partial<Volunteer>): Promise<void> {
  const docRef = doc(db, "volunteers", id);
  await updateDoc(docRef, data);
}

export async function deleteVolunteer(id: string): Promise<void> {
  const docRef = doc(db, "volunteers", id);
  await deleteDoc(docRef);
}

export async function getLocations(): Promise<Location[]> {
  const q = query(collection(db, "locations"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Location));
}

export async function createLocation(data: Omit<Location, "id" | "createdAt">): Promise<string> {
  const docRef = await addDoc(collection(db, "locations"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<void> {
  const docRef = doc(db, "locations", id);
  await updateDoc(docRef, data);
}

export async function deleteLocation(id: string): Promise<void> {
  const docRef = doc(db, "locations", id);
  await deleteDoc(docRef);
}

export async function getTasks(locationId?: string): Promise<Task[]> {
  let q;
  if (locationId) {
    q = query(
      collection(db, "tasks"),
      where("locationId", "==", locationId),
      orderBy("name", "asc")
    );
  } else {
    q = query(collection(db, "tasks"), orderBy("name", "asc"));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Task));
}

export async function createTask(data: Partial<Omit<Task, "id" | "createdAt">>): Promise<string> {
  const cleanData = { ...data };
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key as keyof typeof cleanData] === undefined) {
      delete cleanData[key as keyof typeof cleanData];
    }
  });
  const docRef = await addDoc(collection(db, "tasks"), {
    ...cleanData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const cleanData = { ...data };
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key as keyof typeof cleanData] === undefined) {
      delete cleanData[key as keyof typeof cleanData];
    }
  });
  const docRef = doc(db, "tasks", id);
  await updateDoc(docRef, cleanData);
}

export async function deleteTask(id: string): Promise<void> {
  const docRef = doc(db, "tasks", id);
  await deleteDoc(docRef);
}

export async function getAssignments(): Promise<Assignment[]> {
  const q = query(collection(db, "assignments"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Assignment));
}

export async function getAssignmentsByVolunteer(volunteerId: string): Promise<Assignment[]> {
  const q = query(
    collection(db, "assignments"),
    where("volunteerId", "==", volunteerId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Assignment));
}

export async function getAssignmentsByTask(taskId: string): Promise<Assignment[]> {
  const q = query(
    collection(db, "assignments"),
    where("taskId", "==", taskId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Assignment));
}

export async function createAssignment(
  data: Omit<Assignment, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "assignments"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function deleteAssignment(id: string): Promise<void> {
  const docRef = doc(db, "assignments", id);
  await deleteDoc(docRef);
}

export async function nukeAllData(): Promise<void> {
  const collections = ["volunteers", "locations", "tasks", "assignments"];
  
  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletePromises = snapshot.docs.map((document) => 
      deleteDoc(doc(db, collectionName, document.id))
    );
    await Promise.all(deletePromises);
  }
}

export async function nukeVolunteersAndAssignments(): Promise<void> {
  const collections = ["volunteers", "assignments"];
  
  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletePromises = snapshot.docs.map((document) => 
      deleteDoc(doc(db, collectionName, document.id))
    );
    await Promise.all(deletePromises);
  }
}

export async function migrateJamatKhaneField(): Promise<{ success: number; skipped: number; errors: number }> {
  const volunteers = await getVolunteers();
  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const volunteer of volunteers) {
    try {
      const volunteerData = volunteer as unknown as Record<string, unknown>;
      const oldFieldValue = volunteerData["select-your-primary-jamat-khane"];
      
      if (oldFieldValue && !volunteer.jamatKhane) {
        const docRef = doc(db, "volunteers", volunteer.id);
        await updateDoc(docRef, {
          jamatKhane: oldFieldValue,
          "select-your-primary-jamat-khane": deleteField()
        });
        success++;
      } else if (oldFieldValue && volunteer.jamatKhane) {
        const docRef = doc(db, "volunteers", volunteer.id);
        await updateDoc(docRef, {
          "select-your-primary-jamat-khane": deleteField()
        });
        success++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error migrating volunteer ${volunteer.id}:`, error);
      errors++;
    }
  }

  return { success, skipped, errors };
}

export async function checkInVolunteer(
  assignmentId: string,
  volunteerId: string,
  materialsIssued?: { [key: string]: boolean }
): Promise<void> {
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer) throw new Error("Volunteer not found");

  const checkIns = volunteer.checkIns || [];
  const existingCheckInIndex = checkIns.findIndex(ci => ci.assignmentId === assignmentId);

  const checkInRecord: CheckInRecord = {
    assignmentId,
    checkInTime: Timestamp.now(),
    materialsIssued,
  };

  if (existingCheckInIndex >= 0) {
    checkIns[existingCheckInIndex] = {
      ...checkIns[existingCheckInIndex],
      ...checkInRecord,
    };
  } else {
    checkIns.push(checkInRecord);
  }

  await updateVolunteer(volunteerId, { checkIns });
  await updateAssignmentStatus(assignmentId, "checked-in");
}

export async function checkOutVolunteer(
  assignmentId: string,
  volunteerId: string,
  materialsReturned?: { [key: string]: boolean }
): Promise<void> {
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer) throw new Error("Volunteer not found");

  const checkIns = volunteer.checkIns || [];
  const checkInIndex = checkIns.findIndex(ci => ci.assignmentId === assignmentId);

  if (checkInIndex >= 0) {
    checkIns[checkInIndex] = {
      ...checkIns[checkInIndex],
      checkOutTime: Timestamp.now(),
      materialsReturned,
    };
  } else {
    checkIns.push({
      assignmentId,
      checkOutTime: Timestamp.now(),
      materialsReturned,
    });
  }

  await updateVolunteer(volunteerId, { checkIns });
  await updateAssignmentStatus(assignmentId, "completed");
}

export async function getVolunteerCheckIns(
  volunteerId: string,
  dateRange?: { start: Date; end: Date }
): Promise<CheckInRecord[]> {
  const volunteer = await getVolunteer(volunteerId);
  if (!volunteer || !volunteer.checkIns) return [];

  let checkIns = volunteer.checkIns;

  if (dateRange) {
    checkIns = checkIns.filter((ci) => {
      if (!ci.checkInTime) return false;
      const checkInDate = ci.checkInTime.toDate();
      return checkInDate >= dateRange.start && checkInDate <= dateRange.end;
    });
  }

  return checkIns;
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: "pending" | "checked-in" | "completed"
): Promise<void> {
  const docRef = doc(db, "assignments", assignmentId);
  await updateDoc(docRef, { status });
}

export async function updateAssignment(
  id: string,
  data: Partial<Assignment>
): Promise<void> {
  const docRef = doc(db, "assignments", id);
  await updateDoc(docRef, data);
}

export async function generateUniqueCodesForExistingVolunteers(): Promise<{
  success: number;
  skipped: number;
  errors: number;
}> {
  const volunteers = await getVolunteers();
  let success = 0;
  let skipped = 0;
  let errors = 0;

  const existingCodes = new Set<string>();
  volunteers.forEach((v) => {
    if (v.uniqueCode) {
      existingCodes.add(v.uniqueCode);
    }
  });

  for (const volunteer of volunteers) {
    try {
      if (volunteer.uniqueCode) {
        skipped++;
        continue;
      }

      let newCode: string;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        newCode = "";
        for (let i = 0; i < 8; i++) {
          newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        attempts++;
      } while (existingCodes.has(newCode) && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error("Could not generate unique code");
      }

      existingCodes.add(newCode);

      const docRef = doc(db, "volunteers", volunteer.id);
      await updateDoc(docRef, { uniqueCode: newCode });
      success++;
    } catch (error) {
      console.error(`Error generating code for volunteer ${volunteer.id}:`, error);
      errors++;
    }
  }

  return { success, skipped, errors };
}
