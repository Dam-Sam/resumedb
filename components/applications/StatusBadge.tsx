import { STATUS_LABELS, type Status } from "@/lib/applications/repository";

const BADGE: Record<Status, string> = {
  applied: "rdb-badge--applied",
  received: "rdb-badge--received",
  screening: "rdb-badge--screening",
  interview: "rdb-badge--interview",
  offer: "rdb-badge--offer",
  rejected: "rdb-badge--closed",
};

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`rdb-badge ${BADGE[status]}`}>{STATUS_LABELS[status]}</span>;
}
