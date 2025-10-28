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
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizePhone } from "./utils";

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: "volunteer" | "lead";
  leadTaskIds?: string[];
  experiences?: string[];
  ageRange?: string[];
  shifts: { [key: string]: string[] };
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

export async function updateVolunteer(id: string, data: Partial<Volunteer>): Promise<void> {
  const docRef = doc(db, "volunteers", id);
  await updateDoc(docRef, data);
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
  // Remove undefined or empty locationId
  if (!cleanData.locationId) {
    delete cleanData.locationId;
  }
  const docRef = await addDoc(collection(db, "tasks"), {
    ...cleanData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const cleanData = { ...data };
  // Remove undefined or empty locationId
  if (!cleanData.locationId) {
    delete cleanData.locationId;
  }
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
