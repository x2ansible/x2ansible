import React, { useState } from "react";
import ContextSidebar from "../components/ContextSidebar";
import ContextPanel from "../components/ContextPanel";

export default function ContextPage() {
  // Use your default vector DB id from config.yaml ("iac")
  const [vectorDbId] = useState("iac");
  const [uploadSignal, setUploadSignal] = useState(0);

  return (
    <div className="flex h-screen">
      <div className="w-1/3">
        <ContextSidebar
          vectorDbId={vectorDbId}
          onDocUploaded={() => setUploadSignal((s) => s + 1)}
        />
      </div>
      <div className="flex-1">
        <ContextPanel vectorDbId={vectorDbId} key={uploadSignal} />
      </div>
    </div>
  );
}
