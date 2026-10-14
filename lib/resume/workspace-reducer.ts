import { PROJECT_TYPES, TRIMMED_TYPES, type Side, type TailoredBullet, type TailoredItem, type TailoredResume } from "./types";

// Every change you make in the workspace is one of these actions.
// The state lives only in the browser tab; leaving the page drops it.
export type WorkspaceAction =
  | { type: "select"; bulletId: string; side: Side }
  | { type: "edit"; bulletId: string; text: string }
  | { type: "selectTitle"; itemId: string; side: Side }
  | { type: "editSummary"; text: string }
  | { type: "remove"; bulletId: string }
  | { type: "restore"; bulletId: string }
  | { type: "setItemRemoved"; itemId: string; removed: boolean }
  | { type: "setSkillRemoved"; skillId: string; removed: boolean }
  | { type: "replace"; bulletId: string; with: { id: string; body: string } }
  | { type: "moveSection"; from: string; to: string }
  | { type: "load"; state: TailoredResume };

export function workspaceReducer(state: TailoredResume, action: WorkspaceAction): TailoredResume {
  switch (action.type) {
    case "select":
      return updateBullet(state, action.bulletId, (b) => ({ ...b, selected: action.side }));
    case "edit":
      // Only the selected side is editable.
      return updateBullet(state, action.bulletId, (b) => ({
        ...b,
        edited: { ...b.edited, [b.selected]: action.text },
      }));
    case "selectTitle":
      return updateItems(state, (i) => (i.id === action.itemId ? { ...i, titleSelected: action.side } : i));
    case "editSummary":
      return { ...state, summary: action.text };
    case "remove":
      return updateBullet(state, action.bulletId, (b) => ({ ...b, removed: true }));
    case "restore":
      return updateBullet(state, action.bulletId, (b) => ({ ...b, removed: false }));
    case "setItemRemoved":
      return updateItems(state, (i) => (i.id === action.itemId ? { ...i, removed: action.removed } : i));
    case "setSkillRemoved":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.kind !== "skills"
            ? s
            : { ...s, skills: s.skills.map((k) => (k.id === action.skillId ? { ...k, removed: action.removed } : k)) },
        ),
      };
    case "replace":
      return replaceBullet(state, action.bulletId, action.with);
    case "load":
      return action.state;
    case "moveSection": {
      const keys = state.sections.map((s) => s.key);
      const from = keys.indexOf(action.from);
      const to = keys.indexOf(action.to);
      if (from < 0 || to < 0 || from === to) return state;
      const sections = [...state.sections];
      sections.splice(to, 0, sections.splice(from, 1)[0]);
      return { ...state, sections };
    }
  }
}

function updateBullet(
  state: TailoredResume,
  bulletId: string,
  change: (b: TailoredBullet) => TailoredBullet,
): TailoredResume {
  return {
    ...state,
    sections: state.sections.map((s) =>
      s.kind !== "items"
        ? s
        : {
            ...s,
            items: s.items.map((item) =>
              item.bullets.some((b) => b.id === bulletId)
                ? { ...item, bullets: item.bullets.map((b) => (b.id === bulletId ? change(b) : b)) }
                : item,
            ),
          },
    ),
  };
}

function updateItems(state: TailoredResume, change: (i: TailoredItem) => TailoredItem): TailoredResume {
  return {
    ...state,
    sections: state.sections.map((s) => (s.kind !== "items" ? s : { ...s, items: s.items.map(change) })),
  };
}

// Swaps a bullet for another real bullet from the same item, in the same spot.
// A hidden bullet comes back with its AI rewrite; one the tailoring never had
// shows as a single column with your wording.
function replaceBullet(state: TailoredResume, bulletId: string, next: { id: string; body: string }): TailoredResume {
  return updateItems(state, (item) => {
    if (!item.bullets.some((b) => b.id === bulletId)) return item;
    const current = item.bullets.find((b) => b.id === bulletId)!;
    const hidden = item.bullets.find((b) => b.id === next.id && b.removed);
    const incoming: TailoredBullet = hidden
      ? { ...hidden, removed: false }
      : { id: next.id, original: next.body, ai: null, selected: "original", edited: {}, removed: false, rank: current.rank };
    return {
      ...item,
      bullets: item.bullets.filter((b) => b !== hidden).map((b) => (b.id === bulletId ? incoming : b)),
    };
  });
}

// The cuts that bring a resume down to one page, in the order they're made:
// the least relevant project bullets (each project keeps one), then the least
// relevant projects, then experience bullets (each role keeps one).
// Jobs, education, the header and the summary are never cut.
export function trimPlan(state: TailoredResume): WorkspaceAction[] {
  const items = state.sections.flatMap((s) => (s.kind === "items" ? s.items : [])).filter((i) => !i.removed);
  const projects = items.filter((i) => PROJECT_TYPES.includes(i.type));
  const roles = items.filter((i) => TRIMMED_TYPES.includes(i.type) && !PROJECT_TYPES.includes(i.type));

  // Every visible bullet after each item's first, least relevant first.
  const extraBullets = (list: TailoredItem[]) =>
    list
      .flatMap((i) => i.bullets.filter((b) => !b.removed).slice(1))
      .sort((a, b) => b.rank - a.rank)
      .map((b): WorkspaceAction => ({ type: "remove", bulletId: b.id }));

  return [
    ...extraBullets(projects),
    // Projects are already in relevance order, so the last is the least relevant.
    ...[...projects].reverse().map((i): WorkspaceAction => ({ type: "setItemRemoved", itemId: i.id, removed: true })),
    ...extraBullets(roles),
  ];
}
