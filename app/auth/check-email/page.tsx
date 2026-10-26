import { Mail } from "lucide-react";
import ResendConfirmation from "./ResendConfirmation";

export default async function CheckEmail({
  searchParams,
}: PageProps<"/auth/check-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : "";

  return (
    <div className="au-wrap">
      <div className="au rdb-section">
        <div className="au-mail">
          <Mail className="rdb-icon" width={22} height={22} aria-hidden />
        </div>
        <h1 className="rdb-h1" style={{ fontSize: 28 }}>
          Check your email
        </h1>
        <p style={{ margin: "12px 0 0" }}>
          We sent a confirmation link
          {address && (
            <>
              {" "}
              to <b>{address}</b>
            </>
          )}
          . Open it to finish creating your account.
        </p>
        <p className="rdb-small rdb-muted" style={{ margin: "12px 0 0" }}>
          Nothing there after a minute? Check spam, or send it again. You can
          also continue with Google instead.
        </p>
        {address && <ResendConfirmation email={address} />}
      </div>
    </div>
  );
}
