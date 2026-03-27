// refreshExperiences.ts
// Utility to refresh experiences data from the latest auto-generated file
import { EXPERIENCES } from "./experiencesData";

export function getAllExperiences() {
  return EXPERIENCES;
}

// Optionally, add logic to flag new/changed experiences for admin review
