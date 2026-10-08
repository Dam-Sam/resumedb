import type { Side, TailoredBullet, TailoredResume } from "./types";

// Every change you make in the workspace is one of these actions.
// The state lives only in the browser tab; leaving the page drops it.
export type WorkspaceAction =
  | { type: "select"; bulletId: string; side: Side }
  | { type: "edit"; bulletId: string; text: string }
  | { type: "editSummary"; text: string }
  | { type: "remove"; bulletId: string }
  | { type: "replace"; bulletId: string; with: { id: string; body: string } }
  | { type: "moveSection"; from: string; to: string };

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
    case "editSummary":
      return { ...state, summary: action.text };
    case "remove":
      return updateBullet(state, action.bulletId, (b) => ({ ...b, removed: true }));
    case "replace":
      return replaceBullet(state, action.bulletId, action.with);
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

// Swaps a bullet for another real bullet from the same item. It has no AI version,
// so it shows as a single column with your wording.
function replaceBullet(state: TailoredResume, bulletId: string, next: { id: string; body: string }): TailoredResume {
  return {
    ...state,
    sections: state.sections.map((s) =>
      s.kind !== "items"
        ? s
        : {
            ...s,
            items: s.items.map((item) =>
              !item.bullets.some((b) => b.id === bulletId)
                ? item
                : {
                    ...item,
                    bullets: item.bullets
                      // A previously removed copy of the incoming bullet would be a duplicate.
                      .filter((b) => !(b.id === next.id && b.removed))
                      .map((b) =>
                        b.id === bulletId
                          ? { id: next.id, original: next.body, ai: null, selected: "original" as const, edited: {}, removed: false }
                          : b,
                      ),
                  },
            ),
          },
    ),
  };
}
