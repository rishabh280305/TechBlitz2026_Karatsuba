import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getAppointmentsByDate } from "@/lib/queries";
import { getOpenAIClient } from "@/lib/openai";
import { format } from "date-fns";

// GET /api/ai/schedule-summary?date=yyyy-MM-dd
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const appointments = (await getAppointmentsByDate(
    dateKey,
    session.user.id,
    session.user.clinicId,
  )) as Array<Record<string, unknown>>;

  if (appointments.length === 0) {
    return NextResponse.json({ summary: "No appointments scheduled for this day. Enjoy your free time!" });
  }

  const apptLines = appointments
    .map((a, idx) => {
      const patient = a.patientId as Record<string, string> | null;
      return `${idx + 1}. ${a.startTime}–${a.endTime} | ${patient?.fullName ?? "Unknown"} | Reason: ${a.reason || "General consultation"} | Previous notes: ${a.notes || "None"}`;
    })
    .join("\n");

  const prompt = `You are a clinical AI assistant. Give Dr. ${session.user.name} at ${session.user.clinicName} a concise morning briefing.

Date: ${dateKey}
Total appointments: ${appointments.length}

Schedule:
${apptLines}

Provide:
• SCHEDULE OVERVIEW – total patients, time distribution, busiest period
• PATIENTS TO WATCH – anyone with notable reasons, recurring issues, or no prior notes
• QUICK PREP TIPS – anything the doctor should prepare or be aware of

Keep it under 180 words. Use bullet points. Be direct and actionable.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a clinical assistant. Return very short plain text only. No markdown, no headings, no bold.",
        },
        {
          role: "user",
          content: `${prompt}\n\nFORMAT RULES:\n- Maximum 3 bullet points\n- Maximum 12 words per bullet\n- Focus only: patient count, one key risk, one prep tip\n- Keep total under 45 words`,
        },
      ],
      max_tokens: 120,
      temperature: 0.2,
    });
    const summary = completion.choices[0]?.message?.content?.trim() ?? "Unable to generate summary.";
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
