import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // Remove leading 1 (US country code) if present and we have 11 digits
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.substring(1);
  }
  return digits;
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  if (normalized.length === 0) return "";
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6) return `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`;
}

export function formatTime(time?: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function generateUniqueVolunteerCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface VolunteerFormData {
  name: string;
  phone: string;
  email: string;
  specialSkill?: string;
  experiences?: string[];
  shifts: Record<string, string[]>;
  submittedAt: Timestamp;
}

export async function submitVolunteerForm(data: Omit<VolunteerFormData, "submittedAt"> & Record<string, string | string[] | Record<string, string[]>>) {
  try {
    const volunteersRef = collection(db, "volunteers");
    const uniqueCode = generateUniqueVolunteerCode();
    const docRef = await addDoc(volunteersRef, {
      ...data,
      uniqueCode,
      submittedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id, uniqueCode };
  } catch (error) {
    console.error("Error submitting form:", error);
    throw error;
  }
}
