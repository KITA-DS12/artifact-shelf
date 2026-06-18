import { invoke } from "@tauri-apps/api/core";
import {
  type Library,
  CURRENT_SCHEMA_VERSION,
} from "../types/artifact";

export function emptyLibrary(): Library {
  return { version: CURRENT_SCHEMA_VERSION, artifacts: [] };
}

export async function loadLibrary(): Promise<Library> {
  return invoke<Library>("load_library");
}

export async function saveLibrary(library: Library): Promise<void> {
  await invoke("save_library", { library });
}
