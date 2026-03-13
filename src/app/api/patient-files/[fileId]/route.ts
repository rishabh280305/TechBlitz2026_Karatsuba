import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PatientFileModel } from "@/models/PatientFile";

type RouteContext = { params: Promise<{ fileId: string }> };

// GET /api/patient-files/[fileId] — download file
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  await connectToDatabase();
  const file = await PatientFileModel.findOne({
    _id: fileId,
    clinicId: session.user.clinicId,
  }).lean();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = Buffer.from(file.data as string, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType as string,
      "Content-Disposition": `inline; filename="${file.fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

// DELETE /api/patient-files/[fileId]
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  await connectToDatabase();
  const result = await PatientFileModel.deleteOne({
    _id: fileId,
    clinicId: session.user.clinicId,
    doctorId: session.user.id,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "File not found or not authorized" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
