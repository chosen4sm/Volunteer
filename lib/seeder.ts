import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_FORM_CONFIG, type FormConfig } from "./config";

/**
 * Seed the form configuration to Firebase.
 * Call this once from the admin dashboard to initialize the config.
 * After that, you can update it directly in Firebase console or from admin panel.
 */
export async function seedFormConfig() {
  try {
    await setDoc(doc(db, "form-config", "main"), DEFAULT_FORM_CONFIG);
    console.log("Form config seeded successfully!");
    return { success: true, message: "Form config seeded to Firebase" };
  } catch (error) {
    console.error("Error seeding form config:", error);
    throw error;
  }
}

/**
 * Update the form configuration in Firebase.
 * Only admins should be able to call this.
 */
export async function updateFormConfig(config: FormConfig) {
  try {
    await setDoc(doc(db, "form-config", "main"), config);
    console.log("Form config updated successfully!");
    return { success: true, message: "Form config updated" };
  } catch (error) {
    console.error("Error updating form config:", error);
    throw error;
  }
}
