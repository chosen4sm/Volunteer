import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface FormQuestion {
  id: string;
  type: "text" | "tel" | "email" | "select" | "checkbox-multi" | "shifts";
  label: string;
  placeholder?: string;
  required: boolean;
  optionsFrom?: "experiences";
  options?: Array<{ id: string; label: string }>;
}

export interface FormConfig {
  days: string[];
  dayDates: string[];
  shifts: string[];
  experiences: Array<{ id: string; label: string }>;
  questions: FormQuestion[];
  acceptingSubmissions?: boolean;
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  days: ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
  dayDates: ["November 7th", "November 8th", "November 9th", "November 10th", "November 11th"],
  shifts: ["12am-6am", "6am-12pm", "12pm-6pm", "6pm-12am"],
  experiences: [
    { id: "construction", label: "Construction" },
    { id: "decor", label: "Decor" },
  ],
  acceptingSubmissions: true,
  questions: [
    {
      id: "name",
      type: "text",
      label: "What's your full name?",
      placeholder: "Type your answer here...",
      required: true,
    },
    {
      id: "phone",
      type: "tel",
      label: "What's your phone number?",
      placeholder: "Type your answer here...",
      required: true,
    },
    {
      id: "email",
      type: "email",
      label: "Your email address?",
      placeholder: "name@example.com",
      required: true,
    },
    {
      id: "experience",
      type: "checkbox-multi",
      label: "Do you have experience in the following?",
      required: false,
      optionsFrom: "experiences",
    },
    {
      id: "shifts",
      type: "shifts",
      label: "Select your availability",
      required: false,
    },
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
