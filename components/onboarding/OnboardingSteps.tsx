const STEPS = ["Upload", "Check your profile", "Tailor your first resume"];

export default function OnboardingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="ob-steps" aria-label="Setup">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={i === current ? "on" : i < current ? "done" : undefined}
          aria-current={i === current ? "step" : undefined}
        >
          {s}
        </li>
      ))}
    </ol>
  );
}
