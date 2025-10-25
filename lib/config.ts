import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface FormConfig {
  days: string[];
  dayDates: string[];
  shifts: string[];
  teams: string[];
  experiences: Array<{ id: string; label: string }>;
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  days: ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  dayDates: ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  shifts: ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  teams: ["IV", "PMP"],
  experiences: [
    { id: "construction", label: "Construction" },
    { id: "decor", label: "Decor" },
  ],
};

let cachedConfig: FormConfig | null = null;

export async function getFormConfig(): Promise<FormConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configDoc = await getDoc(doc(db, "form-config", "main"));
    if (configDoc.exists()) {
      const data = configDoc.data() as FormConfig;
      cachedConfig = data;
      return data;
    }
  } catch (error) {
    console.error("Error fetching form config from Firebase:", error);
  }

  // Fallback to default config
  cachedConfig = DEFAULT_FORM_CONFIG;
  return DEFAULT_FORM_CONFIG;
}

// Clear cache when needed (useful for admin updates)
export function invalidateConfigCache() {
  cachedConfig = null;
}
