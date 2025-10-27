import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  if (normalized.length === 0) return "";
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6) return `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`;
}

export interface VolunteerFormData {
  name: string;
  phone: string;
  email: string;
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
