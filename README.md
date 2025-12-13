
# TU Hmawbi Fresher Welcome Voting System

A modern, secure, and interactive online voting system designed for the University Fresher Welcome Ceremony. This application allows students and teachers to vote for King, Queen, Prince, and Princess titles using a secure class-based authentication system.

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Design:** Glassmorphism aesthetics with "Cyber/Tech" fonts (Orbitron, Rajdhani).
- **Animations:** CSS Keyframes (Blobs, Pulse, FadeIn).

### Backend & Database
- **Platform:** Supabase (BaaS)
- **Database:** PostgreSQL
- **Authentication:** Custom Logic (Year + Major + Roll No + Passcode).
- **Real-time:** Supabase Realtime (for live voting updates).

### AI Integration
- **Provider:** Google Gemini API (`@google/genai`)
- **Features:** 
  - AI Voting Assistant (Chatbot).
  - "Vibe Check" generator for candidates.

---

## ✨ Features

1.  **Secure Login:**
    - Students login using Year, Major, Roll Number, and a class-specific Fruit Passcode (e.g., "Apple").
    - Teachers login using Department and a shared Teacher Passcode.
2.  **Live Voting:**
    - Real-time countdown timer synchronized across clients.
    - Interactive ballot with gender-segregated selection.
3.  **Admin Dashboard:**
    - Manage Candidates (Add/Delete/Edit).
    - Manage Students (Authorize/Revoke/Bulk Delete).
    - View Live Results (Bar charts with percentage breakdowns).
    - Emergency Controls (Lock/Unlock voting, Reset all votes).
4.  **Resilience:**
    - **Mock Mode:** Runs entirely in-memory if Supabase credentials are missing (great for testing).
    - **Offline Handling:** Graceful error messages and retry logic.

---

## 🛠️ Step-by-Step Setup Guide

### 1. Prerequisites
- Node.js (v18 or higher)
- A Supabase Account
- A Google AI Studio API Key (optional, for AI features)

### 2. Installation

```bash
# Clone the repository (if applicable) or download source
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory. This project uses `VITE_` prefix for client-side variables.

```env
# Supabase Configuration (Required for persistence)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key

# Google Gemini AI (Optional)
VITE_API_KEY=your_google_aistudio_key
```

> **Note:** If you leave these blank, the app will automatically start in **MOCK MODE**, storing data only in the browser's memory.

### 4. Database Setup (Supabase SQL)

Run the following SQL in your Supabase SQL Editor to set up the required tables:

```sql
-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Students Table (Note: Teachers are also stored here)
create table students (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  year text not null,
  major text not null,
  roll_number text not null,
  passcode text not null,
  type text default 'Student', -- 'Student' or 'Teacher'
  has_voted boolean default false
);

-- 3. Create Candidates Table
create table candidates (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  candidate_number int, -- Optional, app handles fallback if missing
  major text not null,
  year text,
  gender text not null, -- 'Male' or 'Female'
  image text -- Base64 or URL
);

-- 4. Create Votes Table
create table votes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  voter_id uuid references students(id) not null,
  king_id uuid references candidates(id),
  queen_id uuid references candidates(id),
  prince_id uuid references candidates(id),
  princess_id uuid references candidates(id)
);

-- 5. App Config (For Timer)
create table app_config (
  key text primary key,
  value text
);

-- 6. Insert Default Config
insert into app_config (key, value) values ('event_start_time', now());

-- 7. Manual Insert Example for Teacher
-- IMPORTANT: There is NO 'teachers' table. Everything is in 'students'.
-- If you want to insert a teacher manually via SQL, use this format:
-- INSERT INTO students (name, major, type, passcode, year, roll_number) 
-- VALUES ('Daw Su Yee H', 'EC', 'Teacher', 'TEEC', 'Teacher', 'T-EC-001');
```

### 5. Running the App

```bash
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in your terminal).

---

## 🔐 Admin Access

To access the dashboard, click the "Admin" link on the login page.

**Default Credentials (Hardcoded in `AdminLogin.tsx`):**
- **Super Admin:**
  - Username: `superadmin`
  - Password: `super123`
- **Viewer Admin:**
  - Username: `admin`
  - Password: `admin123`

---

## 📱 Passcode Logic

Passcodes are deterministically generated based on Year and Major to make distribution easier.
See `constants.ts` for the full list.

Example:
- 1st Year Civil: **"Apple"**
- 3rd Year CEIT: **"Grape"**

Teachers default passcode: **"TEACHER"** (unless overridden in dashboard).
