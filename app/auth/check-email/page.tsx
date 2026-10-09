import ResendConfirmation from "./ResendConfirmation";

export default async function CheckEmail({ searchParams }: PageProps<"/auth/check-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : "";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="mt-3 text-gray-600">
        We sent a confirmation link{address && <> to <strong>{address}</strong></>}. Click it to finish
        creating your account.
      </p>
      <p className="mt-3 text-sm text-gray-600">
        Nothing there? Check your spam folder, or send it again. You can also sign in with Google
        instead.
      </p>
      {address && <ResendConfirmation email={address} />}
    </div>
  );
}
