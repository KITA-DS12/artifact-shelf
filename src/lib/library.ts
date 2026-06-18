import { invoke } from "@tauri-apps/api/core";
import {
  type Library,
  CURRENT_SCHEMA_VERSION,
} from "../types/artifact";
import type { ImportResult } from "../types/import";

export function emptyLibrary(): Library {
  return { version: CURRENT_SCHEMA_VERSION, artifacts: [] };
}

export async function loadLibrary(): Promise<Library> {
  return invoke<Library>("load_library");
}

export async function saveLibrary(library: Library): Promise<void> {
  await invoke("save_library", { library });
}

export async function importArtifacts(paths: string[]): Promise<ImportResult> {
  return invoke<ImportResult>("import_artifacts", { paths });
}

export async function readArtifactContent(id: string): Promise<string> {
  return invoke<string>("read_artifact_content", { id });
}
