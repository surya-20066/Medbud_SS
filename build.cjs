const fs = require('fs');

let content = fs.readFileSync('src/pages/PublicBooking.tsx', 'utf8');

content = content.replace(/const PublicBooking = \(\) => {/g, 'const BookAppointment = () => {');
content = content.replace(/export default PublicBooking;/g, 'export default BookAppointment;');

content = content.replace(
  'const [loading, setLoading] = useState(false);',
  'const [loading, setLoading] = useState(false);\n  const [user, setUser] = useState<any>(null);\n\n  useEffect(() => {\n    checkAuth();\n  }, []);\n\n  const checkAuth = async () => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) {\n      navigate("/auth");\n      return;\n    }\n    setUser(user);\n  };'
);

content = content.replace(
  /const bookingSchema = z\.object\(\{[\s\S]*?\}\);/,
  `const bookingSchema = z.object({
  symptoms: z.string()
    .trim()
    .max(1000, "Symptoms description must be less than 1000 characters")
    .optional()
});`
);

content = content.replace(
  /type BookingDetails = \{[\s\S]*?\};/,
  `type BookingDetails = {
  symptoms: string;
};`
);

content = content.replace(
  /const newAppointmentId = crypto\.randomUUID\(\);\s*const { error: apptError } = await supabase\s*\.from\("appointments"\)\s*\.insert\(\[\s*{\s*id: newAppointmentId,\s*doctor_id: selectedDoctor\.id,\s*appointment_date: selectedDate,\s*appointment_time: selectedTime,\s*symptoms: bookingDetails\.symptoms \|\| null,\s*patient_name: bookingDetails\.patientName\.trim\(\),\s*patient_email: bookingDetails\.patientEmail\.trim\(\),\s*patient_phone: bookingDetails\.patientPhone\.trim\(\),\s*payment_status: "completed",\s*payment_method: paymentMethod,\s*status: "confirmed",\s*},\s*\]\);/,
  `const newAppointmentId = crypto.randomUUID();
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
        ]);`
);

content = content.replace(/token_type: "online",/g, 'token_type: "appointment",');

const oldPatientCardRegex = /<Card className="p-6">\s*<h3 className="font-semibold text-lg mb-4">Patient Information<\/h3>[\s\S]*?<\/Card>/;
const newPatientCard = `<Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Additional Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                      <Textarea
                        id="symptoms"
                        value={bookingDetails.symptoms}
                        onChange={(e) => handleInputChange("symptoms", e.target.value)}
                        placeholder="Describe your symptoms..."
                        className={\`mt-2 \${validationErrors.symptoms ? 'border-destructive' : ''}\`}
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {(bookingDetails.symptoms || "").length}/1000 characters
                      </p>
                      {validationErrors.symptoms && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.symptoms}</p>
                      )}
                    </div>
                  </div>
                </Card>`;

content = content.replace(oldPatientCardRegex, newPatientCard);

content = content.replace(/doc\.text\('Name:', leftCol, yPos\);[\s\S]*?doc\.text\(bookingDetails\.patientName, leftCol \+ 25, yPos\);/, '');
content = content.replace(/doc\.setFont\('helvetica', 'normal'\);[\s\S]*?doc\.text\('Email:', rightCol, yPos\);[\s\S]*?doc\.text\(bookingDetails\.patientEmail, rightCol \+ 25, yPos\);/, '');
content = content.replace(/yPos \+= 8;[\s\S]*?doc\.text\('Phone:', leftCol, yPos\);[\s\S]*?doc\.text\(bookingDetails\.patientPhone, leftCol \+ 25, yPos\);/, '');

content = content.replace(
  /\{\/\*\s*Patient Details\s*\*\/\}[\s\S]*?<motion\.div[\s\S]*?className="grid grid-cols-2 gap-4"[\s\S]*?<\/motion\.div>/,
  `{/* Removed Patient details from ticket */}`
);

content = content.replace(
  /<motion\.div[\s\S]*?className="text-left"[\s\S]*?<p className="text-xs text-muted-foreground">Email<\/p>[\s\S]*?<p className="font-semibold">\{bookingDetails\.patientEmail\}<\/p>[\s\S]*?<\/motion\.div>/,
  ''
);

content = content.replace(
  /patientName: "",\s*patientEmail: "",\s*patientPhone: "",/,
  ''
);

fs.writeFileSync('src/pages/BookAppointment.tsx', content);
console.log('Done cleanly!');
