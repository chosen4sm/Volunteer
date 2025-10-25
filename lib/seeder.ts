import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_FORM_CONFIG, getFormConfig, invalidateConfigCache, type FormConfig } from "./config";

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

/**
 * Populate the jamat-khane question with Jamat locations
 */
export async function populateJamatKhaneOptions() {
  try {
    const config = await getFormConfig();
    const jamatOptions = [
      { id: "dallas-headquarters", label: "Dallas Headquarters" },
      { id: "lewisville", label: "Lewisville" },
      { id: "plano", label: "Plano" },
      { id: "mid-cities", label: "Mid-cities" },
      { id: "tri-cities", label: "Tri-cities" },
      { id: "weco", label: "Weco" },
      { id: "tyler", label: "Tyler" },
      { id: "little-rock", label: "Little Rock" },
      { id: "albuquerque", label: "Albuquerque" },
      { id: "denver", label: "Denver" },
      { id: "oklahoma", label: "Oklahoma" },
    ];

    const updatedConfig = {
      ...config,
      questions: config.questions.map((q) =>
        q.id === "jamat-khane"
          ? { ...q, options: jamatOptions }
          : q
      ),
    };

    await updateFormConfig(updatedConfig);
    invalidateConfigCache();
    return { success: true, message: "Jamat Khane options added successfully" };
  } catch (error) {
    console.error("Error populating jamat-khane options:", error);
    throw error;
  }
}
