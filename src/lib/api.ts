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
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  getSettings: () => invoke<{ activeProfileId: string | null }>("get_settings"),
  setActiveProfile: (id: string) =>
    invoke<void>("set_active_profile", { id }),
  startEngine: (controllerPath?: string) =>
    invoke<EngineStatus>("start_engine", { controllerPath: controllerPath ?? null }),
  stopEngine: () => invoke<EngineStatus>("stop_engine"),
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  livePreview: () => invoke<LivePreview>("live_preview"),
};
