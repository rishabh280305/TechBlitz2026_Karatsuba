import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/Appointment";
import { PatientModel } from "@/models/Patient";
import { PatientFileModel } from "@/models/PatientFile";
import { getOpenAIClient } from "@/lib/openai";

// POST /api/ai/patient-summary
// Body: { patientId: string }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { patientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { patientId } = body;
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const patient = await PatientModel.findOne({
    _id: patientId,
    clinicId: session.user.clinicId,
  }).lean();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Past completed appointments (most recent 10)
  const pastAppointments = await AppointmentModel.find({
    patientId: new Types.ObjectId(patientId),
    clinicId: session.user.clinicId,
    status: "COMPLETED",
  })
    .sort({ startAt: -1 })
    .limit(10)
    .lean();

  // Uploaded files (metadata + data for images)
  const allFiles = await PatientFileModel.find({
    patientId,
    clinicId: session.user.clinicId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // History text
  const historyText =
    pastAppointments.length > 0
      ? pastAppointments
          .map(
            (a, i) =>
              `Visit ${i + 1} (${a.appointmentDate}): Reason: ${a.reason || "N/A"} | Doctor notes: ${a.notes || "None recorded"}`,
          )
          .join("\n")
      : "No previous completed visits on record.";

  const filesText =
    allFiles.length > 0
      ? allFiles
          .map(
            (f) =>
              `• ${f.fileName} [${f.category}] — ${f.fileSize ? Math.round((f.fileSize as number) / 1024) + " KB" : "unknown size"} — uploaded ${(f as Record<string, unknown>).createdAt instanceof Date ? ((f as Record<string, unknown>).createdAt as Date).toLocaleDateString() : "recently"}`,
          )
          .join("\n")
      : "No files uploaded for this patient.";

  const patientInfo = `Patient: ${(patient as Record<string, unknown>).fullName}, DOB: ${(patient as Record<string, unknown>).dateOfBirth ? new Date((patient as Record<string, unknown>).dateOfBirth as string).toLocaleDateString() : "N/A"}, Phone: ${(patient as Record<string, unknown>).phone}`;

  // Image files for vision (max 3, most recent)
  const imageFiles = allFiles
    .filter((f) => (f.mimeType as string).startsWith("image/"))
    .slice(0, 3);

  const textPart = `You are a clinical AI assistant. Analyze the patient records below and give the treating doctor a structured, accurate medical summary.

${patientInfo}

APPOINTMENT HISTORY (${pastAppointments.length} completed ${pastAppointments.length === 1 ? "visit" : "visits"}):
${historyText}

UPLOADED FILES (${allFiles.length} total):
${filesText}${imageFiles.length > 0 ? "\n\n[Medical images are attached. Please analyze and include findings.]" : ""}

Respond with:
1. MEDICAL HISTORY SUMMARY – known conditions, recurring issues, diagnoses
2. PRESCRIPTIONS & TREATMENTS – medications / treatments provided
3. KEY FINDINGS FROM FILES – what reports or scans show${imageFiles.length > 0 ? " (analyze attached images)" : ""}
4. CURRENT PATIENT STATUS – overall health picture
5. TODAY'S VISIT NOTES – what the doctor should focus on

Be clinical, specific, and concise.`;

  // Build message content with optional images
  type TextPart = { type: "text"; text: string };
  type ImagePart = { type: "image_url"; image_url: { url: string; detail: "auto" } };
  const contentParts: Array<TextPart | ImagePart> = [{ type: "text", text: textPart }];

  for (const f of imageFiles) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${f.mimeType};base64,${f.data}`,
        detail: "auto",
      },
    });
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: contentParts }],
      max_tokens: 700,
    });
    const summary = completion.choices[0]?.message?.content ?? "Unable to generate summary.";
    return NextResponse.json({
      summary,
      patientName: (patient as Record<string, unknown>).fullName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
