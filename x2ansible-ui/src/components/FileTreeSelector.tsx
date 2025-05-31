"use client";
import React, { useEffect, useState } from "react";
import { FolderIcon, DocumentIcon } from "@heroicons/react/24/outline";

export interface TreeNode {
  type: "file" | "folder";
  name: string;
  path: string;
  items?: TreeNode[];
}

interface FileTreeSelectorProps {
  fetchTree: (path?: string) => Promise<TreeNode[]>;
  selectedFiles: string[];
  setSelectedFiles: (files: string[]) => void;
}

// Clean API client
class FileTreeAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === "development" 
      ? "http://localhost:8000" 
      : "";
  }

  async fetchTree(path: string = ""): Promise<TreeNode[]> {
    try {
      const url = path 
        ? `${this.baseUrl}/api/files/tree?path=${encodeURIComponent(path)}`
        : `${this.baseUrl}/api/files/tree`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Failed to fetch file tree:", error);
      return [];
    }
  }

  async fetchFiles(filePaths: string[]): Promise<{path: string, content: string}[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/files/get_many`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filePaths),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Failed to fetch files:", error);
      throw error;
    }
  }
}

const api = new FileTreeAPI();

export default function FileTreeSelector({ 
  fetchTree,
  selectedFiles, 
  setSelectedFiles
}: FileTreeSelectorProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    const treeData = await api.fetchTree();
    setTree(treeData);
    setLoading(false);
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = selectedFiles.includes(filePath)
      ? selectedFiles.filter(f => f !== filePath)
      : [...selectedFiles, filePath];
    setSelectedFiles(newSelection);
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedFiles.includes(node.path);

    if (node.type === "folder") {
      return (
        <div key={node.path} className="select-none">
          <div
            className="flex items-center py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer"
            onClick={() => toggleExpanded(node.path)}
          >
            {/* Clear, visible expansion indicator */}
            <div className="w-6 h-6 flex items-center justify-center mr-1">
              <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                <svg 
                  className="w-3 h-3 text-white transition-transform"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <FolderIcon className="w-4 h-4 text-yellow-500 mr-2" />
            <span className="text-slate-200 text-sm font-medium">{node.name}</span>
          </div>
          
          {isExpanded && node.items && (
            <div className="ml-6 border-l border-slate-600 pl-2">
              {node.items.map(renderTreeNode)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={node.path} className="flex items-center py-1 px-2 hover:bg-slate-700/30 rounded">
        <div className="w-6 mr-1" />
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleFileSelection(node.path)}
          className="mr-2 rounded accent-blue-500"
        />
        <DocumentIcon className="w-4 h-4 text-blue-400 mr-2" />
        <label 
          className="text-slate-300 text-sm cursor-pointer"
          onClick={() => toggleFileSelection(node.path)}
        >
          {node.name}
        </label>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">📁 File Explorer</h3>
          {selectedFiles.length > 0 && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
              {selectedFiles.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="p-3 h-64 overflow-y-auto">
        {loading ? (
          <div className="text-slate-500 text-center py-8">Loading files...</div>
        ) : tree.length === 0 ? (
          <div className="text-slate-500 text-center py-8">No files found</div>
        ) : (
          <div className="space-y-1">
            {tree.map(renderTreeNode)}
          </div>
        )}
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="border-t border-slate-700 p-3">
          <div className="text-xs font-medium text-slate-400 mb-2">Selected Files:</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {selectedFiles.map(file => (
              <div key={file} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate">{file}</span>
                <button
                  onClick={() => {
                    const newSelection = selectedFiles.filter(f => f !== file);
                    setSelectedFiles(newSelection);
                  }}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This component is just for display - the analyze button is in WorkflowSidebar */}
    </div>
  );
}