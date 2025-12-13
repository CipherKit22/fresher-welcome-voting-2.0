
import { Candidate, Major, Year, StudentInfo } from "./types";

// Generate unique fruit passcodes for 9 years (Y1-Y6, M1, M2, Teacher is separate) * 7 majors
// Expanded list to cover new Master classes
export const FRUITS = [
  "Apple",       // 0
  "Apricot",     // 1
  "Avocado",     // 2
  "Banana",      // 3
  "Blackberry",  // 4
  "Blueberry",   // 5
  "Boysenberry", // 6
  "Cantaloupe",  // 7
  "Cherry",      // 8
  "Clementine",  // 9
  "Coconut",     // 10
  "Cranberry",   // 11
  "Date",        // 12
  "Dragonfruit", // 13
  "Durian",      // 14
  "Elderberry",  // 15
  "Grape",       // 16
  "Fig",         // 17
  "Gooseberry",  // 18
  "Grapefruit",  // 19
  "Guava",       // 20
  "Honeydew",    // 21
  "Jackfruit",   // 22
  "Kiwi",        // 23
  "Kumquat",     // 24
  "Lemon",       // 25
  "Lime",        // 26
  "Lychee",      // 27
  "Mandarin",    // 28
  "Mango",       // 29
  "Mangosteen",  // 30
  "Melon",       // 31
  "Mulberry",    // 32
  "Nectarine",   // 33
  "Orange",      // 34
  "Papaya",      // 35
  "Passionfruit",// 36
  "Peach",       // 37
  "Pear",        // 38
  "Persimmon",   // 39
  "Pineapple",   // 40
  "Plantain",    // 41
  "Plum",        // 42
  "Pomegranate", // 43
  "Pomelo",      // 44
  "Quince",      // 45
  "Raspberry",   // 46
  "Redcurrant",  // 47
  "Starfruit",   // 48
  "Strawberry",  // 49
  "Tamarind",    // 50
  "Tangerine",   // 51
  "Watermelon",  // 52
  "Yuzu",        // 53
  "Ackee",       // 54
  "Bilberry",    // 55
  "Cacao",       // 56 (New)
  "Feijoa",      // 57 (New)
  "Huckleberry", // 58 (New)
  "Jujube",      // 59 (New)
  "Juniper",     // 60 (New)
  "Longan",      // 61 (New)
  "Loquat",      // 62 (New)
  "Olive",       // 63 (New)
  "Rambutan",    // 64 (New)
  "Salak"        // 65 (New)
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
