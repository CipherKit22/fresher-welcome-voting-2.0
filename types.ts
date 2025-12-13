
export enum Year {
  Y1 = "1st year",
  Y2 = "2nd year",
  Y3 = "3rd year",
  Y4S1 = "4th year 1st sem",
  Y4S2 = "4th year 2nd sem",
  Y5 = "5th year",
  Y6 = "6th year",
  Master1 = "Master 1st Year",
  Master2 = "Master 2nd Year",
  Staff = "Teacher" // Changed from "Staff" to "Teacher"
}

export enum Major {
  Civil = "Civil",
  Archi = "Archi",
  CEIT = "CEIT",
  EP = "EP",
  EC = "EC",
  Mechanical = "Mechanical",
  MC = "MC",
  Myanmar = "Myanmar",
  English = "English",
  Math = "Engineering Mathematics",
  Chem = "Engineering Chemistry",
  Phys = "Engineering Physics"
}

export enum AdminRole {
  SuperAdmin = "SuperAdmin",
  Admin = "Admin"
}

export interface StudentInfo {
  id?: string; // Database UUID
  name?: string;
  type?: 'Student' | 'Teacher'; // Added type
  year: Year | string;
  major: Major | string;
  rollNumber: string;
  hasVoted?: boolean;
  passcode?: string;
}

export interface Candidate {
  id: string;
  name: string;
  candidateNumber: number;
  major: Major;
  year?: string; 
  gender: 'Male' | 'Female';
  image: string;
}

export interface Votes {
  male: string | null;
  female: string | null;
}

export enum VotingRole {
  King = "King",
  Queen = "Queen",
  Prince = "Prince",
  Princess = "Princess"
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}
