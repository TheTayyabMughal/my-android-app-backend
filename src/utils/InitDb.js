import { Services } from "../models/Services.model.js"; 


const defaultServices = [
  { name: "Tailor" },
  { name: "Laundry" }
];

export const initializeServices = async () => {
  try {
    const count = await Services.countDocuments();
    if (count === 0) {
      await Services.insertMany(defaultServices);
      console.log("✅ Default services added!");
    } else {
      console.log("⚠️ Services already initialized.");
    }
  } catch (error) {
    console.error("❌ Error initializing services:", error);
  }
};
