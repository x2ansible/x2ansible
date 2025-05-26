// src/types/api.ts

export interface ClassificationResponse { 
  classification: string; 
  summary?: string;
  detailed_analysis?: string;
  resources?: string[];
  key_operations?: string[];
  dependencies?: string;
  configuration_details?: string;
  complexity_level?: string;
  convertible?: boolean;
  conversion_notes?: string;
  duration_ms?: number;
  manual_estimate_ms?: number;
  speedup?: number;
  error?: string;
}

// src/types/api.ts

export interface ClassificationResult {
  classification: string;
  summary?: string;
  detailed_analysis?: string;
  resources?: string[];
  key_operations?: string[];
  dependencies?: string;
  configuration_details?: string;
  complexity_level?: string;
  convertible: boolean;
  conversion_notes?: string;
  duration_ms?: number;
  manual_estimate_ms?: number;
  speedup?: number;
  error?: string;
}


export interface FileUploadResponse {
  saved_files: string[];
  error?: string;
}

export interface FileListResponse {
  folders?: string[];
  files?: string[];
  error?: string;
}

export interface CloneResponse {
  cloned?: string;
  error?: string;
}

export interface TreeItem {
  type: "file" | "folder";
  name: string;
}

export interface TreeResponse {
  items: TreeItem[];
  error?: string;
}