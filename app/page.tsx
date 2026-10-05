import Link from "next/link";

const STEPS = [
  ["Upload your resume", "PDF or Word. We read it into your profile once, so you never upload it again."],
  ["Check your profile", "Fix anything we got wrong, and add a short personal background."],
  ["Paste a job posting", "Company, job title, and the job description."],
  ["See it reordered", "Your most relevant experience and projects move to the top, and your skills are sorted by relevance."],
  ["Compare every bullet", "Each of your bullets sits beside an AI rewrite aimed at the job. Keep yours or take the AI's, one by one."],
  ["Add a tailored summary", "Optionally, a short summary written from your background and aimed at the posting."],
  ["Download", "Get your tailored resume as Word and PDF."],
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Tailor your resume to the job. You decide every change.</h1>
      <p className="mt-3 text-gray-600">
        ResumeDB markets your real experience to the job you want, and shows every AI rewrite next to
        your original, like a diff.
      </p>

      <ol className="mt-10 space-y-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-gray-600">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex gap-3">
        <Link href="/sign-up" className="rounded-md bg-gray-900 px-4 py-2 text-white">
          Sign up
        </Link>
        <Link href="/sign-in" className="rounded-md border border-gray-300 bg-white px-4 py-2">
          Sign in
        </Link>
      </div>
    </div>
  );
}
