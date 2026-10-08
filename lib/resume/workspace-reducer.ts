import type { Side, TailoredBullet, TailoredResume } from "./types";

// Every change you make in the workspace is one of these actions.
// The state lives only in the browser tab; leaving the page drops it.
export type WorkspaceAction =
  | { type: "select"; bulletId: string; side: Side }
  | { type: "edit"; bulletId: string; text: string }
  | { type: "editSummary"; text: string };

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
