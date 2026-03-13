"use client";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { addPatientAction } from "@/app/dashboard/receptionist/actions";

export function AddPatientInline() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addPatientAction(formData);
        router.refresh();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add patient.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setError(null); }}
        className="mt-1 text-sm border-2 border-black px-2 py-1 font-semibold shadow-[2px_2px_0_0_#000] bg-white hover:bg-[var(--panel)]"
      >
        {open ? "✕ Cancel" : "+ New Patient"}
      </button>

      {open && (
        <div className="mt-2 border-2 border-black bg-[var(--panel)] p-3 shadow-[4px_4px_0_0_#000]">
          <p className="mb-2 text-sm font-bold">Add New Patient</p>
          {error && <p className="mb-2 text-xs text-red-600 font-semibold">{error}</p>}
          <form action={handleSubmit} className="grid gap-2">
            <input
              name="fullName"
              required
              placeholder="Full name *"
              className="w-full border-2 border-black px-3 py-2 text-sm"
            />
            <input
              name="phone"
              required
              placeholder="Phone *"
              className="w-full border-2 border-black px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full border-2 border-black px-3 py-2 text-sm"
            />
            <textarea
              name="notes"
              placeholder="Notes"
              rows={2}
              className="w-full border-2 border-black px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="border-2 border-black bg-black px-3 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add Patient"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
