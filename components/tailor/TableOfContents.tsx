"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// The resume's sections in order. Drag one by its handle to move it.
export default function TableOfContents({
  sections,
  onMove,
}: {
  sections: { key: string; title: string }[];
  onMove: (from: string, to: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  }

  return (
    <nav aria-label="Contents" className="text-sm">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Contents</h2>
      <DndContext id="toc" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {sections.map((s) => (
              <Row key={s.key} id={s.key} title={s.title} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="mt-2 text-xs text-gray-500">Drag ⠿ to reorder.</p>
    </nav>
  );
}

function Row({ id, title }: { id: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded bg-white ${isDragging ? "shadow-md ring-1 ring-gray-300" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Move ${title}`}
        className="cursor-grab touch-none px-1.5 py-1 text-gray-400 hover:text-gray-900"
      >
        ⠿
      </button>
      <a href={`#section-${id}`} className="flex-1 rounded px-1 py-1 hover:bg-gray-100">
        {title}
      </a>
    </li>
  );
}
