import { buildFinalResume } from "./final";
import { countPdfPages } from "./files";
import type { TailoredResume } from "./types";
import { trimPlan, workspaceReducer } from "./workspace-reducer";

// Makes the cuts from trimPlan until the PDF fits on one page, measuring the real
// PDF. Binary search keeps it to a handful of renders. If even every cut can't
// fit one page, all of them are made and the page count shows the rest.
export async function fitToOnePage(
  state: TailoredResume,
  pages: (s: TailoredResume) => Promise<number> = (s) => countPdfPages(buildFinalResume(s)),
): Promise<TailoredResume> {
  const plan = trimPlan(state);
  const apply = (k: number) => plan.slice(0, k).reduce(workspaceReducer, state);
  if (!plan.length || (await pages(state)) <= 1) return state;

  let lo = 1;
  let hi = plan.length;
  if ((await pages(apply(hi))) > 1) return apply(hi);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((await pages(apply(mid))) <= 1) hi = mid;
    else lo = mid + 1;
  }
  return apply(lo);
}
