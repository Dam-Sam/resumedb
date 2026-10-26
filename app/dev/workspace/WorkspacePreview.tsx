"use client";

import { useRouter } from "next/navigation";
import Workspace from "@/components/tailor/Workspace";
import type { TailorResponse } from "@/lib/resume/types";

export default function WorkspacePreview({ data, jobDescription }: { data: TailorResponse; jobDescription: string }) {
  const router = useRouter();
  return <Workspace data={data} jobDescription={jobDescription} onStartOver={() => router.push("/dev")} />;
}
