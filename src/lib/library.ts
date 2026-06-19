import { invoke } from "@tauri-apps/api/core";
import {
  type Artifact,
  type Library,
  CURRENT_SCHEMA_VERSION,
} from "../types/artifact";
import type { ImportResult } from "../types/import";
import type { ArtifactUpdate } from "../types/edit";

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

export async function searchInContents(query: string): Promise<string[]> {
  return invoke<string[]>("search_in_contents", { query });
}

export async function updateArtifact(
  id: string,
  update: ArtifactUpdate,
): Promise<Artifact> {
  return invoke<Artifact>("update_artifact", { id, update });
}

/** 選択した Artifact をゴミ箱に移動する（deletedAt をセット） */
export async function deleteArtifacts(ids: string[]): Promise<number> {
  return invoke<number>("delete_artifacts", { ids });
}

/** ゴミ箱から戻す */
export async function restoreArtifacts(ids: string[]): Promise<number> {
  return invoke<number>("restore_artifacts", { ids });
}

/** library.json から完全に削除する（元ファイルは触らない） */
export async function purgeArtifacts(ids: string[]): Promise<number> {
  return invoke<number>("purge_artifacts", { ids });
}

/** ゴミ箱を空にする */
export async function emptyTrash(): Promise<number> {
  return invoke<number>("empty_trash");
}

export async function openInFinder(path: string): Promise<void> {
  await invoke("open_in_finder", { path });
}

export async function openWithDefault(path: string): Promise<void> {
  await invoke("open_with_default", { path });
}

export async function openExternalUrl(url: string): Promise<void> {
  await invoke("open_external_url", { url });
}

export async function copyToClipboard(text: string): Promise<void> {
  await invoke("copy_to_clipboard", { text });
}

export async function checkFileExists(path: string): Promise<boolean> {
  return invoke<boolean>("check_file_exists", { path });
}

export async function checkMissingArtifacts(): Promise<string[]> {
  return invoke<string[]>("check_missing_artifacts");
}

export async function relinkArtifact(
  id: string,
  newPath: string,
): Promise<Artifact> {
  return invoke<Artifact>("relink_artifact", { id, newPath });
}
