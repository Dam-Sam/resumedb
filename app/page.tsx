import Link from "next/link";

const STEPS = [
  [
    "Create your profile",
    "Upload your resume once (PDF or Word) and we read it into a structured profile: contact details, experience, projects, education and skills. Check it over, fix anything we misread, and add a few lines about who you are and what you want next. You only do this once.",
  ],
  [
    "Tailor to a job posting",
    "Paste the company, job title and description. Your most relevant experience and projects move up, and skills are sorted by what the job asks for. You review every suggested change and accept or reject each one, so nothing is rewritten without your say.",
  ],
  [
    "Download and track",
    "Download the tailored resume as a PDF or Word file. Each application is saved to your tracker with a frozen copy of the exact resume you sent, so you can re-download it later and keep its status up to date as you hear back.",
  ],
];

const PROMISES = [
  [
    "True to you, every time.",
    "We reorder and rephrase what's already in your profile. We never add experience you don't have, and you approve every line.",
  ],
  [
    "Your agents can use it too.",
    "Connect Claude, Muse or any MCP agent. They send a posting, get back a tailored one-page PDF, and tell us when they've applied.",
  ],
  [
    "Your inbox keeps score.",
    "Connect Gmail and replies from employers move applications along your Tracker. It only reads; it never sends.",
  ],
];

export default function Landing() {
  return (
    <>
      <section className="ld-hero">
        <div>
          <p className="rdb-eyebrow">
            For the job hunt you&apos;d rather not do by hand
          </p>
          <h1>Let us do the tedious part.</h1>
          <p className="ld-lede">
            ResumeDB tailors your resume to each job from one honest profile of
            everything you&apos;ve done. Every rewrite sits beside your own
            words, and nothing goes out that you didn&apos;t choose.
          </p>
          <div className="rdb-actions" style={{ marginTop: 28 }}>
            <Link href="/sign-up" className="rdb-btn rdb-btn--primary">
              Create an account
            </Link>
            <Link href="/sign-in" className="rdb-btn rdb-btn--secondary">
              Sign in
            </Link>
          </div>
          <p className="rdb-small rdb-muted" style={{ marginTop: 12 }}>
            Free while in beta. Sign up with Google or email.
          </p>
        </div>
        <div className="ld-art" aria-hidden="true">
          <div className="ld-sheet ld-back" />
          <div className="ld-sheet ld-front">
            <div className="ld-pill" style={{ width: "70%" }} />
            <div className="ld-pill tailored" style={{ width: "90%" }} />
            <div className="ld-pill" style={{ width: "55%" }} />
            <div className="ld-cmp">
              <div className="side mine">
                <span>Yours</span>Built ETL jobs in Java and SQL that load daily
                transaction data.
              </div>
              <div className="side ai">
                <span>For this job</span>Built <mark>batch data pipelines</mark>{" "}
                in Java and SQL that load daily transaction data.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-how">
        <h2>How it works</h2>
        <ol className="ld-steps">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ld-promise">
        {PROMISES.map(([title, body]) => (
          <div key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
        ))}
      </section>

      <footer className="ld-foot">
        <span className="rdb-brand">ResumeDB</span>
        <span className="rdb-small rdb-muted">
          Tailored to the job. True to you.
        </span>
      </footer>
    </>
  );
}
