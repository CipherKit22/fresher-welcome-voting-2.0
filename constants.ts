
import { Candidate, Major, Year, StudentInfo } from "./types";

// Generate unique fruit passcodes for 9 years (Y1-Y6, M1, M2, Teacher is separate) * 7 majors
// Expanded list to cover new Master classes
export const FRUITS = [
  // Y1 (0-6)
  "Apple", "Apricot", "Avocado", "Banana", "Blackberry", "Blueberry", "Boysenberry",
  // Y2 (7-13)
  "Cantaloupe", "Cherry", "Clementine", "Coconut", "Cranberry", "Date", "Dragonfruit",
  // Y3 (14-20)
  "Durian", "Elderberry", "Grape", "Fig", "Gooseberry", "Grapefruit", "Guava",
  // Y4S1 (21-27)
  "Honeydew", "Jackfruit", "Kiwi", "Kumquat", "Lemon", "Lime", "Lychee",
  // Y4S2 (28-34)
  "Mandarin", "Mango", "Mangosteen", "Melon", "Mulberry", "Nectarine", "Orange",
  // Y5 (35-41)
  "Papaya", "Passionfruit", "Peach", "Pear", "Persimmon", "Pineapple", "Plantain",
  // Y6 (42-48)
  "Plum", "Pomegranate", "Pomelo", "Quince", "Raspberry", "Redcurrant", "Starfruit",
  // Master 1st Year (49-55)
  "Strawberry", "Tamarind", "Tangerine", "Watermelon", "Yuzu", "Ackee", "Bilberry",
  // Master 2nd Year (56-62)
  "Cacao", "Feijoa", "Huckleberry", "Jujube", "Juniper", "Longan", "Loquat",
  // Extras / Spares
  "Olive", "Rambutan", "Salak"
];

// Define Majors available for Students (Engineering only)
export const STUDENT_MAJORS = [
  Major.Civil,
  Major.Archi,
  Major.CEIT,
  Major.EP,
  Major.EC,
  Major.Mechanical,
  Major.MC
];

// Helper to get passcode deterministically
export const getClassPasscode = (year: Year, major: Major): string => {
  const yearIndex = Object.values(Year).indexOf(year);
  const majorIndex = Object.values(Major).indexOf(major);
  // Ensure we don't go out of bounds if Year enum grows
  const flatIndex = (yearIndex * 7 + majorIndex) % FRUITS.length;
  return FRUITS[flatIndex];
};

// Fallback time if DB fetch fails
export const DEFAULT_EVENT_TIME = new Date(Date.now() + 10 * 60 * 1000).toISOString();

// --- IN-MEMORY MOCK DATA STORAGE (Starts Empty) ---
// These are used when the app is running without a Supabase connection (Mock Mode)
// Data added via Admin Dashboard will be stored here.

export const MOCK_STUDENTS: StudentInfo[] = []; // Stores both Students and Teachers
export const MOCK_CANDIDATES: Candidate[] = [];
