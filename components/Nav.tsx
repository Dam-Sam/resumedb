import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavLock from "./NavLock";
import NavTabs from "./NavTabs";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("contact_info")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    name = data?.full_name?.trim() || null;
  }

  return (
    <NavLock>
      <Link href="/" className="rdb-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="on-light" src="/brand/resumedb-mark.svg" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="on-dark"
          src="/brand/resumedb-mark-on-dark.svg"
          alt=""
        />
        ResumeDB
      </Link>
      {user ? (
        <>
          <NavTabs />
          <div className="rdb-account">
            <Link
              href="/profile"
              className="rdb-avatar rdb-avatar--link"
              aria-label="Your profile"
              title={name ?? user.email ?? undefined}
            >
              {initials(name, user.email)}
            </Link>
            <form action="/auth/sign-out" method="post">
              <button
                className="rdb-btn rdb-btn--quiet rdb-btn--sm"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="rdb-account">
          <Link href="/sign-in" className="rdb-btn rdb-btn--quiet rdb-btn--sm">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rdb-btn rdb-btn--primary rdb-btn--sm"
          >
            Create an account
          </Link>
        </div>
      )}
    </NavLock>
  );
}

// "Sam Zhang" -> "SZ"; with no name yet, the first letter of the email.
function initials(name: string | null, email: string | undefined) {
  const words = name?.split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 1)
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}
