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
import { GripVertical } from "lucide-react";

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
    <nav aria-label="Contents" className="ws-toc">
      <p className="rdb-eyebrow">Contents</p>
      <DndContext id="toc" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <ol>
            {sections.map((s) => (
              <Row key={s.key} id={s.key} title={s.title} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="rdb-small rdb-muted">Drag to reorder sections. The download follows this order.</p>
      <div className="ws-legend">
        <p className="rdb-eyebrow">Reading the page</p>
        <div>
          <span className="ws-sw on" />
          Goes in the resume
        </div>
        <div>
          <span className="ws-sw off" />
          Not used
        </div>
        <div>
          <mark>words</mark>&nbsp;changed for this job
        </div>
      </div>
    </nav>
  );
}

function Row({ id, title }: { id: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "drag" : undefined}>
      <button {...attributes} {...listeners} aria-label={`Move ${title}`} className="h">
        <GripVertical className="rdb-icon" aria-hidden />
      </button>
      <a href={`#section-${id}`}>{title}</a>
    </li>
  );
}
