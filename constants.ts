
import { Candidate, Major, Year, StudentInfo } from "./types";

// specific codes provided
const PASSCODE_MAP: Record<string, Record<string, string>> = {
  [Major.Civil]: {
    [Year.Y1]: "QXTA", [Year.Y2]: "NQBM", [Year.Y3]: "DPRK",
    [Year.Y4S1]: "WQFA", [Year.Y4S2]: "XJME", [Year.Y5]: "BVXT", [Year.Y6]: "NXKP",
    [Year.Master1]: "QZMX", [Year.Master2]: "ABCD", [Year.Staff]: "TCVQ"
  },
  [Major.Archi]: {
    [Year.Y1]: "LMPF", [Year.Y2]: "YVKA", [Year.Y3]: "ZMWF",
    [Year.Y4S1]: "CLRM", [Year.Y4S2]: "KQBP", [Year.Y5]: "QLMP", [Year.Y6]: "ZQWA",
    [Year.Master1]: "LTAK", [Year.Master2]: "ABDC", [Year.Staff]: "TARC"
  },
  [Major.CEIT]: {
    [Year.Y1]: "ZKWR", [Year.Y2]: "FZRX", [Year.Y3]: "HSXT",
    [Year.Y4S1]: "PZHN", [Year.Y4S2]: "TLRH", [Year.Y5]: "ZDNA", [Year.Y6]: "FHRT",
    [Year.Master1]: "RHYW", [Year.Master2]: "ADBC", [Year.Staff]: "TCIT"
  },
  [Major.EP]: {
    [Year.Y1]: "BHSN", [Year.Y2]: "CHDL", [Year.Y3]: "JQLN",
    [Year.Y4S1]: "KTXB", [Year.Y4S2]: "DSVN", [Year.Y5]: "RHYK", [Year.Y6]: "DLVY",
    [Year.Master1]: "BPND", [Year.Master2]: "BADC", [Year.Staff]: "TEPY"
  },
  [Major.EC]: {
    [Year.Y1]: "JYQD", [Year.Y2]: "PWJT", [Year.Y3]: "RBYC",
    [Year.Y4S1]: "MYDS", [Year.Y4S2]: "AMXZ", [Year.Y5]: "MCAF", [Year.Y6]: "MPSA",
    [Year.Master1]: "MFKQ", [Year.Master2]: "BCDA", [Year.Staff]: "TEEC"
  },
  [Major.Mech]: {
    [Year.Y1]: "RAVK", [Year.Y2]: "KMSE", [Year.Y3]: "MVEA",
    [Year.Y4S1]: "EVKA", [Year.Y4S2]: "QWRT", [Year.Y5]: "PSWQ", [Year.Y6]: "KTXR",
    [Year.Master1]: "XSRA", [Year.Master2]: "DCBA", [Year.Staff]: "TMCH"
  },
  [Major.MC]: {
    [Year.Y1]: "TXEL", [Year.Y2]: "AXQN", [Year.Y3]: "TXKP",
    [Year.Y4S1]: "RBQL", [Year.Y4S2]: "HPLK", [Year.Y5]: "KJTX", [Year.Y6]: "BQLN",
    [Year.Master1]: "JVTL", [Year.Master2]: "DABC", [Year.Staff]: "TMCC"
  },
  [Major.English]: { [Year.Staff]: "TENG" },
  [Major.Math]: { [Year.Staff]: "TMAT" },
  [Major.Chem]: { [Year.Staff]: "TCHM" },
  [Major.Phys]: { [Year.Staff]: "TPHY" }
};

// Define Majors available for Students (Engineering only)
// Explicitly using the requested list: Civil, Archi, EP, EC, CEIT, Mech, MC
export const STUDENT_MAJORS = [
  Major.Civil,
  Major.Archi,
  Major.EP,
  Major.EC,
  Major.CEIT,
  Major.Mech,
  Major.MC
];

// Helper to get passcode deterministically
export const getClassPasscode = (year: Year, major: Major): string => {
  // Check if major exists in map
  if (PASSCODE_MAP[major] && PASSCODE_MAP[major][year]) {
      return PASSCODE_MAP[major][year];
  }
  
  // Default fallback if not defined in the specific list above
  return "1234";
};

// Fallback time if DB fetch fails
export const DEFAULT_EVENT_TIME = new Date(Date.now() + 10 * 60 * 1000).toISOString();

// --- IN-MEMORY MOCK DATA STORAGE (Starts Empty) ---
// These are used when the app is running without a Supabase connection (Mock Mode)
// Data added via Admin Dashboard will be stored here.

export const MOCK_STUDENTS: StudentInfo[] = []; // Stores both Students and Teachers
export const MOCK_CANDIDATES: Candidate[] = [];
