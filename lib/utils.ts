import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface VolunteerFormData {
  name: string;
  phone: string;
  email: string;
  team: string;
  experiences?: string[];
  shifts: Record<string, string[]>;
  submittedAt: Timestamp;
}

export async function submitVolunteerForm(data: Omit<VolunteerFormData, "submittedAt">) {
  try {
    const volunteersRef = collection(db, "volunteers");
    const docRef = await addDoc(volunteersRef, {
      ...data,
      submittedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error submitting form:", error);
    throw error;
  }
}
