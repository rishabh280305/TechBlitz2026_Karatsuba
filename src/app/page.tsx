import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";
import { getDemoCredentials } from "@/lib/demo-credentials";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const created = readValue(params.created) === "1";
  const demoCredentials = getDemoCredentials();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dce7ff_0,_#fef6e8_45%,_#e9fce7_100%)] px-4 py-8 md:px-8 md:py-10">
      <main className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="border-2 border-black bg-white p-7 shadow-[8px_8px_0_0_#000] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Welcome to Clinic OS</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
            Run your clinic day smoothly from one place.
          </h1>
          <p className="mt-5 max-w-3xl text-base text-zinc-700 md:text-lg">
            Book appointments faster, avoid confusion at the front desk, and help doctors stay focused on patients.
            Everything your team needs for daily clinic work is ready in a clean workflow.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="border-2 border-black bg-[#e6eeff] p-4">
              <h3 className="text-base font-black">Reception Desk Ready</h3>
              <p className="mt-1 text-sm">Book, move, and manage appointments in seconds.</p>
            </article>
            <article className="border-2 border-black bg-[#fff1dc] p-4">
              <h3 className="text-base font-black">Doctor Friendly</h3>
              <p className="mt-1 text-sm">See daily schedule, patient history, and notes quickly.</p>
            </article>
            <article className="border-2 border-black bg-[#e8f8e8] p-4">
              <h3 className="text-base font-black">Patient First</h3>
              <p className="mt-1 text-sm">Clear confirmations, reminders, and cancellation flow.</p>
            </article>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border-2 border-black bg-[var(--panel)] p-4">
              <h4 className="font-black">What your team can do</h4>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Manage upcoming and cancelled appointments separately</li>
                <li>Check complete patient visit history by patient name</li>
                <li>Track clinic activity and doctor insights from analytics</li>
              </ul>
            </div>
            <div className="border-2 border-black bg-[#f8f8ff] p-4">
              <h4 className="font-black">Get started quickly</h4>
              <p className="mt-2 text-sm">
                Sign in with doctor or receptionist access, or create linked clinic accounts in one step.
              </p>
              <Link
                href="/create-account"
                className="mt-3 inline-block border-2 border-black bg-[#ffd66b] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Create Clinic Accounts
              </Link>
            </div>
          </div>
        </section>

        <section className="border-2 border-black bg-white p-6 shadow-[8px_8px_0_0_#000] md:p-7">
          <h2 className="text-2xl font-black">Sign In</h2>
          <p className="mt-1 text-sm text-zinc-600">Access your clinic workspace.</p>

          {created ? (
            <p className="mt-3 border-2 border-black bg-[#e8f8e8] p-2 text-sm font-semibold">
              Accounts created successfully. You can log in now.
            </p>
          ) : null}

          <div className="mt-4">
            <LoginForm demoCredentials={demoCredentials} />
          </div>
        </section>
      </main>
    </div>
  );
}
