import { requireDevTools } from "@/lib/dev/guard";
import { DEV_INPUT, devTailorResponse } from "@/lib/dev/fixtures";
import WorkspacePreview from "./WorkspacePreview";

// Dev only: the tailoring workspace on canned data, with no sign-in and no model call.
export default function WorkspacePreviewPage() {
  requireDevTools();
  return <WorkspacePreview data={devTailorResponse()} jobDescription={DEV_INPUT.jobDescription} />;
}
