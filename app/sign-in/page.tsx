import AuthForm from "@/components/AuthForm";

export default async function SignIn({ searchParams }: PageProps<"/sign-in">) {
  const { error } = await searchParams;
  // /auth/callback sends you here when a confirmation link or Google sign-in didn't work.
  const notice = error ? "That sign-in link didn't work or has expired. Please try again." : undefined;
  return <AuthForm mode="sign-in" notice={notice} />;
}
