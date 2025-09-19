import { create } from "zustand";

export const useVideoRecognition = create((set) => ({
  videoElement: null,
  setVideoElement: (videoElement) => set({ videoElement }),
  resultsCallback: null,
  setResultsCallback: (resultsCallback) => set({ resultsCallback }),
  appStatus: "MODEL_LOADING", // MODEL_LOADING, MODEL_LOADED, CAMERA_PREPARING, CAMERA_ACTIVE, TRACKING_ACTIVE
  setAppStatus: (appStatus) => set({ appStatus }),
}));
