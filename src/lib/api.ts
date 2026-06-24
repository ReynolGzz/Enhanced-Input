// Typed wrappers around the Tauri command bridge.
import { invoke } from "@tauri-apps/api/core";
import type {
  ControllerInfo,
  EngineStatus,
  LivePreview,
  Profile,
  ProfileSummary,
} from "./types";

export const api = {
  listControllers: () => invoke<ControllerInfo[]>("list_controllers"),
  listProfiles: () => invoke<ProfileSummary[]>("list_profiles"),
  loadProfile: (id: string) => invoke<Profile>("load_profile", { id }),
  saveProfile: (profile: Profile) => invoke<void>("save_profile", { profile }),
  createProfile: (name: string) => invoke<Profile>("create_profile", { name }),
  duplicateProfile: (id: string) => invoke<Profile>("duplicate_profile", { id }),
  renameProfile: (id: string, name: string) =>
    invoke<void>("rename_profile", { id, name }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  exportProfileCode: (id: string) => invoke<string>("export_profile_code", { id }),
  importProfileCode: (code: string, name: string) =>
    invoke<Profile>("import_profile_code", { code, name }),
  getSettings: () => invoke<{ activeProfileId: string | null }>("get_settings"),
  setActiveProfile: (id: string) =>
    invoke<void>("set_active_profile", { id }),
  startEngine: (controllerPath?: string) =>
    invoke<EngineStatus>("start_engine", { controllerPath: controllerPath ?? null }),
  stopEngine: () => invoke<EngineStatus>("stop_engine"),
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  livePreview: () => invoke<LivePreview>("live_preview"),
  overlayUrl: (style: string) => invoke<string>("overlay_url", { style }),
};
