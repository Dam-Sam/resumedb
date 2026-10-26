// Which words of a rewrite differ from the original, so the workspace can highlight them.
// Pure client-side: a longest-common-subsequence over whitespace-separated words.

export interface DiffPart {
  text: string;
  changed: boolean;
}

const norm = (w: string) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

// Splits `rewrite` into runs, marking the runs that aren't in `original`.
// Spaces between two changed words stay inside the changed run.
export function diffWords(original: string, rewrite: string): DiffPart[] {
  const a = original.split(/\s+/).filter(Boolean).map(norm);
  const tokens = rewrite.split(/(\s+)/);
  const words = tokens.filter((t) => t && !/^\s+$/.test(t));
  const b = words.map(norm);

  // Longest common subsequence table.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);

  const kept = new Array(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      kept[j] = true;
      i++;
      j++;
    }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }

  const parts: DiffPart[] = [];
  const push = (text: string, changed: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.changed === changed) last.text += text;
    else parts.push({ text, changed });
  };
  let w = 0;
  let pendingSpace = "";
  for (const t of tokens) {
    if (!t) continue;
    if (/^\s+$/.test(t)) {
      pendingSpace = t;
      continue;
    }
    const changed = !kept[w++];
    // A space joins the changed run it sits inside, otherwise it belongs to the unchanged text.
    const prev = parts[parts.length - 1];
    if (pendingSpace) push(pendingSpace, changed && prev?.changed ? true : false);
    pendingSpace = "";
    push(t, changed);
  }
  if (pendingSpace) push(pendingSpace, false);
  return parts;
}
