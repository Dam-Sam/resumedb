import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">
          ResumeDB
        </Link>
        {user ? (
          <>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">
              Profile
            </Link>
            <Link href="/tailor" className="text-gray-600 hover:text-gray-900">
              Tailoring
            </Link>
            <Link href="/applications" className="text-gray-600 hover:text-gray-900">
              Tracker
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <form action="/auth/sign-out" method="post" className="ml-auto">
              <button className="text-gray-600 hover:text-gray-900">Sign out</button>
            </form>
          </>
        ) : (
          <div className="ml-auto flex gap-4">
            <Link href="/sign-in" className="text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link href="/sign-up" className="text-gray-600 hover:text-gray-900">
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
