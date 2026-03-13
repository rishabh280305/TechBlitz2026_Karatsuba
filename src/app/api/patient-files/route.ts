import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PatientFileModel } from "@/models/PatientFile";

// GET /api/patient-files?patientId=xxx
// Returns metadata list only (no base64 data field)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  await connectToDatabase();
  const files = await PatientFileModel
    .find({ patientId, clinicId: session.user.clinicId }, "-data")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ files });
}

// POST /api/patient-files
// multipart/form-data: file (File), patientId (string), category (string)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const patientId = formData.get("patientId") as string | null;
  const category = (formData.get("category") as string | null) ?? "document";

  if (!file || !patientId) {
    return NextResponse.json({ error: "file and patientId are required" }, { status: 400 });
  }

  // 5 MB limit
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5 MB" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  await connectToDatabase();
  const saved = await PatientFileModel.create({
    clinicId: session.user.clinicId,
    patientId,
    doctorId: session.user.id,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    data: base64,
    category,
  });

  return NextResponse.json(
    { fileId: String(saved._id), fileName: file.name },
    { status: 201 },
  );
}
