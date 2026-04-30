const fs = require('fs');

let content = fs.readFileSync('src/pages/PublicBooking.tsx', 'utf8');

// Replacements
content = content.replace(/PublicBooking/g, 'BookAppointment');

// Add user state
content = content.replace(
  'const [loading, setLoading] = useState(false);',
  'const [loading, setLoading] = useState(false);\n  const [user, setUser] = useState<any>(null);\n\n  useEffect(() => {\n    checkAuth();\n  }, []);\n\n  const checkAuth = async () => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) {\n      navigate("/auth");\n      return;\n    }\n    setUser(user);\n  };'
);

// We need to change the save logic in handlePayment
const oldInsert = `const newAppointmentId = crypto.randomUUID();
      const { error: apptError } = await supabase
        .from("appointments")
        .insert([
          {
            id: newAppointmentId,
            doctor_id: selectedDoctor.id,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            symptoms: bookingDetails.symptoms || null,
            patient_name: bookingDetails.patientName.trim(),
            patient_email: bookingDetails.patientEmail.trim(),
            patient_phone: bookingDetails.patientPhone.trim(),
            payment_status: "completed",
            payment_method: paymentMethod,
            status: "confirmed",
          },
        ]);`;

const newInsert = `const newAppointmentId = crypto.randomUUID();
      const { error: apptError } = await supabase
        .from("appointments")
        .insert([
          {
            id: newAppointmentId,
            patient_id: user.id,
            doctor_id: selectedDoctor.id,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            symptoms: bookingDetails.symptoms || null,
            payment_status: "completed",
            payment_method: paymentMethod,
            status: "confirmed",
          },
        ]);`;

content = content.replace(oldInsert, newInsert);

// Replace token insert token_type
content = content.replace('token_type: "online",', 'token_type: "appointment",');

// Remove patientName, patientEmail, patientPhone validation
// Wait, the easiest way is to just keep them in bookingDetails but not require them to be valid if we're not asking for them, or just modify the validation schema.
// Let's modify the Zod schema:
content = content.replace(
  `const bookingSchema = z.object({
  patientName: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\\s\\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  patientEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  patientPhone: z.string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .max(15, "Phone number is too long"),
  symptoms: z.string()
    .trim()
    .max(1000, "Symptoms description must be less than 1000 characters")
    .optional()
});`,
  `const bookingSchema = z.object({
  symptoms: z.string()
    .trim()
    .max(1000, "Symptoms description must be less than 1000 characters")
    .optional()
});`
);

// We need to remove the Patient Information card completely, but retain Symptoms text area if we want.
// Wait, if I just remove "patientName", "patientEmail", "patientPhone" form inputs...
content = content.replace(
  /<div>\s*<Label htmlFor="patientName">[\s\S]*?{validationErrors\.patientPhone.*\s*<\/p>\s*)}[^<]*<\/div>/g,
  ''
);

// Let's use a simpler regex or split array logic to remove name/email/phone inputs.
// In step 5, there are 4 divs under `<div className="space-y-4">`
// Divs are for Name, Email, Phone, Symptoms.
// I will just replace the whole `<Card className="p-6"> ... <h3 className="font-semibold text-lg mb-4">Patient Information</h3> ... </Card>`
// Wait, I can't use regex reliably for large HTML snippets.

fs.writeFileSync('modify.cjs', content);
