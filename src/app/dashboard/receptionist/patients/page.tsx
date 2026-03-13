import { connectToDatabase } from "@/lib/db";
import { getPatients } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";
import { addPatientAction, updatePatientAction } from "@/app/dashboard/receptionist/actions";

type ReceptionPatientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function ReceptionPatientsPage({ searchParams }: ReceptionPatientsPageProps) {
  const session = await requireRole("RECEPTIONIST");
  const params = await searchParams;
  const patientSearch = readValue(params.search);

  let dbUnavailable = false;
  let patients: Array<{ _id: string; fullName: string; phone: string; email?: string; notes?: string }> = [];

  try {
    await connectToDatabase();
    patients = (await getPatients(patientSearch, session.user.clinicId)) as Array<{ _id: string; fullName: string; phone: string; email?: string; notes?: string }>;
  } catch {
    dbUnavailable = true;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Add Patient</h2>
        <form action={addPatientAction} className="mt-3 space-y-2">
          <input name="fullName" required placeholder="Full name" className="w-full border-2 border-black px-3 py-2" />
          <input name="phone" required placeholder="Phone" className="w-full border-2 border-black px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="w-full border-2 border-black px-3 py-2" />
          <textarea name="notes" placeholder="Notes" className="w-full border-2 border-black px-3 py-2" />
          <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50">Save Patient</button>
        </form>
      </div>

      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Patient Directory</h2>
        <form method="GET" className="mt-3 flex gap-2">
          <input type="text" name="search" defaultValue={patientSearch} placeholder="Search by name, phone, email" className="w-full border-2 border-black px-3 py-2" />
          <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">Search</button>
        </form>

        <div className="mt-4 space-y-2">
          {patients.length === 0 ? <p className="text-sm">No patients found.</p> : null}
          {patients.map((patient) => (
            <article key={String(patient._id)} className="border-2 border-black bg-[var(--panel)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{patient.fullName}</p>
                <details>
                  <summary className="cursor-pointer list-none border border-black bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50">
                    <span className="inline-flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      Edit
                    </span>
                  </summary>
                  <form action={updatePatientAction} className="mt-2 grid gap-2 border-2 border-black bg-white p-2">
                    <input type="hidden" name="patientId" value={String(patient._id)} />
                    <input name="fullName" required defaultValue={patient.fullName} className="border-2 border-black px-2 py-1 text-xs" />
                    <input name="phone" required defaultValue={patient.phone} className="border-2 border-black px-2 py-1 text-xs" />
                    <input name="email" type="email" required defaultValue={patient.email || ""} className="border-2 border-black px-2 py-1 text-xs" />
                    <textarea name="notes" defaultValue={patient.notes || ""} className="border-2 border-black px-2 py-1 text-xs" rows={2} />
                    <button disabled={dbUnavailable} className="border-2 border-black bg-black px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                      Save Changes
                    </button>
                  </form>
                </details>
              </div>
              <p className="text-sm">Phone: {patient.phone}</p>
              <p className="text-sm">Email: {patient.email || "N/A"}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
