"use client";
import React from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface SelectedFilesPanelProps {
  selectedFiles: string[];
  removeFile: (file: string) => void;
}

export default function SelectedFilesPanel({ selectedFiles, removeFile }: SelectedFilesPanelProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-inner p-3 mt-4">
      <div className="font-semibold text-white mb-2 text-sm">📝 Selected Files</div>
      {selectedFiles.length === 0 ? (
        <div className="text-slate-500 text-xs">No files selected</div>
      ) : (
        <ul>
          {selectedFiles.map((file) => (
            <li key={file} className="flex items-center py-0.5">
              <DocumentTextIcon className="w-4 h-4 text-blue-400 mr-1" />
              <span className="text-slate-300 text-xs mr-2">{file}</span>
              <button
                className="ml-auto text-xs text-red-500 hover:text-red-700"
                onClick={() => removeFile(file)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
