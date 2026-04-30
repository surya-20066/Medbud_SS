# MedBud - Medical Appointment Platform

MedBud is a modern, responsive web application designed to facilitate medical appointments, manage tokens, and seamlessly connect patients with doctors. The project features dedicated dashboards for both patients and doctors, a secure authentication system, and an AI-powered Health Assistant.

## 🚀 Tech Stack & Architecture

### Frontend
- **Framework:** React 18 (via Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Shadcn UI (Radix UI primitives)
- **Animations:** Framer Motion
- **State Management:** TanStack React Query (`@tanstack/react-query`)
- **Routing:** React Router v6 (`react-router-dom`)
- **Form Handling:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Date Handling:** `date-fns` & `react-day-picker`
- **Carousels:** Embla Carousel React & Swiper
- **PDF Generation:** `jspdf`

### Backend / Database (Supabase)
- **Database:** PostgreSQL (managed by Supabase)
- **Authentication:** Supabase Auth (Email/Password, JWT)
- **Edge Functions:** Supabase Edge Functions (e.g., `health-assistant` for AI capabilities)
- **Migrations:** SQL migrations located in `supabase/migrations/`

---

## 📂 Project Structure

```text
MedBud_ss/
├── .env                    # Environment variables (Internal credentials)
├── package.json            # Project dependencies and scripts
├── vite.config.ts          # Vite bundler configuration
├── tailwind.config.ts      # Tailwind CSS theme and plugins setup
├── postcss.config.js       # PostCSS plugins
├── script.js               # Utility script to automate component transformations (e.g., BookAppointment logic)
├── src/
│   ├── App.tsx             # Root component and Route definitions
│   ├── main.tsx            # React application entry point
│   ├── index.css           # Global Tailwind base styles
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # Shadcn UI primitives
│   │   ├── AIHealthAssistant.tsx # AI Chat interface
│   │   ├── Navbar.tsx      # Top navigation
│   │   └── Footer.tsx      # Page footer
│   ├── pages/              # Application views/routes
│   │   ├── Index.tsx             # Landing Page
│   │   ├── Auth.tsx              # Login / Register
│   │   ├── Dashboard.tsx         # General/Admin Dashboard
│   │   ├── PatientDashboard.tsx  # Patient-specific Dashboard
│   │   ├── DoctorDashboard.tsx   # Doctor-specific Dashboard
│   │   ├── BookAppointment.tsx   # Appointment scheduling flow
│   │   ├── DoctorSignup.tsx      # Onboarding for doctors
│   │   └── NotFound.tsx          # 404 Error Page
│   ├── hooks/              # Custom React hooks (e.g., useHealthAssistant)
│   ├── lib/                # Utility functions and library wrappers
│   │   ├── supabase.ts     # Supabase client initialization
│   │   └── utils.ts        # Common utility helpers (like Tailwind merge)
│   └── integrations/       # API / External service configurations
└── supabase/
    ├── functions/          # Supabase Edge Functions (e.g., AI integration)
    └── migrations/         # Database schema creation and alterations (SQL files)
```

---


## 🛠️ Available Scripts

Run these commands using `npm run <script-name>` (or `bun run` / `yarn` depending on your package manager).

- **`dev`**: Starts the Vite development server.
- **`build`**: Compiles TypeScript and builds the app for production.
- **`build:dev`**: Builds the app in development mode.
- **`lint`**: Runs ESLint to identify code quality issues.
- **`preview`**: Serves the built production bundle locally for testing.

---

## 🧠 Key Features & Workflows

1. **Role-Based Routing & Dashboards:** 
   - Uses React Router to map components like `PatientDashboard` and `DoctorDashboard`. User roles determine access and functionality post-authentication.
   
2. **Appointment Booking (`BookAppointment.tsx`):**
   - Integrates user authentication prior to booking.
   - Validates user input with Zod.
   - Assigns a unique UUID for each appointment and saves data directly into the `appointments` table in Supabase.

3. **AI Health Assistant:**
   - Provides users with an interactive chat interface (`AIHealthAssistant.tsx`) powered by an external language model through a Supabase Edge Function (`health-assistant`).
   - Features animated loading states (Framer Motion) and suggested quick prompts.

4. **Automation Script (`script.js`):**
   - Contains a Node.js filesystem script designed to dynamically refactor older `PublicBooking` code into authenticated `BookAppointment` flows by altering regex strings and SQL insert objects.

5. **Design System:**
   - Adopts a modern design aesthetic utilizing glassmorphism, animated transitions, and robust accessibility standards courtesy of Shadcn UI and Radix primitives.
