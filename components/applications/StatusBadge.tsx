import { STATUS_LABELS, type Status } from "@/lib/applications/repository";

const COLORS: Record<Status, string> = {
  applied: "bg-gray-100 text-gray-800",
  received: "bg-blue-50 text-blue-800",
  screening: "bg-indigo-50 text-indigo-800",
  interview: "bg-amber-50 text-amber-800",
  offer: "bg-green-50 text-green-800",
  rejected: "bg-red-50 text-red-800",
};

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}
