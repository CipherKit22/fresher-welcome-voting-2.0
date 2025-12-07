
import { Candidate, Major, Year } from "./types";

// Generate unique fruit passcodes for 8 years * 7 majors = 56 classes
// REORDERED to ensure 3rd Year (idx 2) + CEIT (idx 2) = Index 16 maps to "Grape"
export const FRUITS = [
  "Apple",       // 0: 1st Year - Civil
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
  "Grape",       // 16: 3rd Year - CEIT (Swapped with Fig)
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
  "Bilberry"     // 55
];

// Helper to get passcode deterministically
export const getClassPasscode = (year: Year, major: Major): string => {
  const yearIndex = Object.values(Year).indexOf(year);
  const majorIndex = Object.values(Major).indexOf(major);
  const flatIndex = (yearIndex * 7 + majorIndex) % FRUITS.length;
  return FRUITS[flatIndex];
};

// Sample Database for specific students
// Key format: `${Year}_${Major}_${RollNumber}`
export const STUDENT_DATABASE: Record<string, string> = {
  [`${Year.Y1}_${Major.Civil}_1`]: "Mg Mg", 
  [`${Year.Y3}_${Major.CEIT}_1`]: "Mya Mya",
  // Add more sample data here if needed
};

// Mock Teachers Database
export const MOCK_TEACHERS: Record<Major, string[]> = {
  [Major.Civil]: ["Dr. Kyaw Kyaw", "U Ba Hla", "Daw Nu Nu"],
  [Major.Archi]: ["Dr. Su Su", "U Hla Maung", "Daw Aye Aye"],
  [Major.CEIT]: ["Dr. Thida", "U Aung Myo", "Daw Hlaing", "U Thiha"],
  [Major.EP]: ["Dr. Soe Soe", "U Mya", "Daw Phyu"],
  [Major.EC]: ["Dr. Win Win", "U Ko Ko", "Daw Ni Ni"],
  [Major.Mechanical]: ["Dr. Tun Tun", "U Bo Bo", "Daw Khin"],
  [Major.MC]: ["Dr. Naing", "U Myo", "Daw Sandar"],
  [Major.Myanmar]: ["Daw Khin Mar", "U Myint Soe"],
  [Major.English]: ["Daw San San", "U Kyaw Swar"],
  [Major.Math]: ["Dr. Tin Tin", "U Hlaing Win"],
  [Major.Chem]: ["Daw Mu Mu", "U Zaw Zaw"],
  [Major.Phys]: ["Dr. Cho Cho", "U Than Tun"]
};

// Fallback time if DB fetch fails
export const DEFAULT_EVENT_TIME = new Date(Date.now() + 10 * 60 * 1000).toISOString();

export const MOCK_CANDIDATES: Candidate[] = [
  // Males (King/Prince)
  { id: "m1", name: "Aung Kyaw", major: Major.Civil, gender: "Male", image: "https://picsum.photos/300/400?random=1" },
  { id: "m2", name: "Thura Htun", major: Major.Archi, gender: "Male", image: "https://picsum.photos/300/400?random=2" },
  { id: "m3", name: "Hein Htet", major: Major.CEIT, gender: "Male", image: "https://picsum.photos/300/400?random=3" },
  { id: "m4", name: "Myo Min", major: Major.EP, gender: "Male", image: "https://picsum.photos/300/400?random=4" },
  { id: "m5", name: "Kyaw Swar", major: Major.EC, gender: "Male", image: "https://picsum.photos/300/400?random=5" },
  { id: "m6", name: "Min Thu", major: Major.Mechanical, gender: "Male", image: "https://picsum.photos/300/400?random=6" },
  { id: "m7", name: "Kaung Myat", major: Major.MC, gender: "Male", image: "https://picsum.photos/300/400?random=7" },
  
  // Females (Queen/Princess)
  { id: "f1", name: "Su Su", major: Major.Civil, gender: "Female", image: "https://picsum.photos/300/400?random=8" },
  { id: "f2", name: "May Thet", major: Major.Archi, gender: "Female", image: "https://picsum.photos/300/400?random=9" },
  { id: "f3", name: "Hnin Yu", major: Major.CEIT, gender: "Female", image: "https://picsum.photos/300/400?random=10" },
  { id: "f4", name: "Ei Phyu", major: Major.EP, gender: "Female", image: "https://picsum.photos/300/400?random=11" },
  { id: "f5", name: "Yoon Wadi", major: Major.EC, gender: "Female", image: "https://picsum.photos/300/400?random=12" },
  { id: "f6", name: "Shwe Sin", major: Major.Mechanical, gender: "Female", image: "https://picsum.photos/300/400?random=13" },
  { id: "f7", name: "Nandar Hlaing", major: Major.MC, gender: "Female", image: "https://picsum.photos/300/400?random=14" },
];
