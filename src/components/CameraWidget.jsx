import { Camera } from "@mediapipe/camera_utils";

import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import {
  FACEMESH_TESSELATION,
  HAND_CONNECTIONS,
  Holistic,
  POSE_CONNECTIONS,
} from "@mediapipe/holistic";
import { useEffect, useRef, useState } from "react";
import { useVideoRecognition } from "../hooks/useVideoRecognition";

const startButtonStyle = {
  position: 'fixed',
  bottom: '1rem',
  right: '1rem',
  cursor: 'pointer',
  backgroundColor: '#818cf8', // indigo-400
  color: 'white',
  borderRadius: '50%',
  width: '3rem',
  height: '3rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
  border: 'none',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'background-color 0.2s ease',
};

const startButtonStyleActive = {
  ...startButtonStyle,
  backgroundColor: '#ef4444', // red-500
};

const toggleFeedButtonStyle = {
  position: 'fixed',
  bottom: '1rem',
  right: '1rem',
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
  border: 'none',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'background-color 0.2s ease',
};

const videoContainerStyle = {
  position: 'absolute',
  zIndex: 10,
  bottom: '1rem',
  right: '1rem',
  width: '320px',
  height: '240px',
  borderRadius: '20px',
  overflow: 'hidden',
};

const hiddenStyle = {
  display: 'none',
};

const canvasStyle = {
  position: 'absolute',
  zIndex: 10,
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
};

const videoStyle = {
  position: 'absolute',
  zIndex: 0,
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
};

const statusIndicatorStyle = {
  position: 'fixed',
  bottom: '1rem',
  left: '1rem',
  padding: '0.5rem 1rem',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  borderRadius: '0.5rem',
  zIndex: 20,
  fontSize: '0.875rem',
};

export const CameraWidget = () => {
  const [start, setStart] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(true); // New state for showing/hiding video feed
  const videoElement = useRef();
  const drawCanvas = useRef();
  const setVideoElement = useVideoRecognition((state) => state.setVideoElement);
  const appStatus = useVideoRecognition((state) => state.appStatus);
  const setAppStatus = useVideoRecognition((state) => state.setAppStatus);

  // Automatically start camera when model is loaded
  useEffect(() => {
    if (appStatus === "MODEL_LOADED" && !start) {
      console.log("Model loaded, auto-starting camera");
      setAppStatus("CAMERA_PREPARING");
      setStart(true);
    }
  }, [appStatus, start]);

  const drawResults = (results) => {
    drawCanvas.current.width = videoElement.current.videoWidth;
    drawCanvas.current.height = videoElement.current.videoHeight;
    let canvasCtx = drawCanvas.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      drawCanvas.current.width,
      drawCanvas.current.height
    );
    // Use `Mediapipe` drawing functions
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#00cff7",
      lineWidth: 4,
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "#ff0364",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
      color: "#C0C0C070",
      lineWidth: 1,
    });
    if (results.faceLandmarks && results.faceLandmarks.length === 478) {
      //draw pupils
      drawLandmarks(
        canvasCtx,
        [results.faceLandmarks[468], results.faceLandmarks[468 + 5]],
        {
          color: "#ffe603",
          lineWidth: 2,
        }
      );
    }
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "#eb1064",
      lineWidth: 5,
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
      color: "#00cff7",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "#22c3e3",
      lineWidth: 5,
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
      color: "#ff0364",
      lineWidth: 2,
    });
  };

  useEffect(() => {
    if (!start) {
      setVideoElement(null);
      return;
    }
    if (useVideoRecognition.getState().videoElement) {
      return;
    }
    setVideoElement(videoElement.current);
    setAppStatus("CAMERA_ACTIVE");
    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
      },
    });
    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
      refineFaceLandmarks: true,
    });
    holistic.onResults((results) => {
      drawResults(results);
      useVideoRecognition.getState().resultsCallback?.(results);
      // Update status to tracking active when we get results
      if (appStatus !== "TRACKING_ACTIVE") {
        setAppStatus("TRACKING_ACTIVE");
      }
    });
    const camera = new Camera(videoElement.current, {
      onFrame: async () => {
        await holistic.send({ image: videoElement.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  }, [start]);

  const getStatusText = () => {
    switch (appStatus) {
      case "MODEL_LOADING":
        return "Loading model...";
      case "MODEL_LOADED":
        return "Model loaded";
      case "CAMERA_PREPARING":
        return "Preparing camera...";
      case "CAMERA_ACTIVE":
        return "Camera active";
      case "TRACKING_ACTIVE":
        return "Tracking active";
      default:
        return "Ready";
    }
  };

  return (
    <>
      <div style={statusIndicatorStyle}>
        {getStatusText()}
      </div>
      {start && ( // Only show the toggle button if the camera is started
        <button
          onClick={() => setShowVideoFeed(!showVideoFeed)}
          style={toggleFeedButtonStyle}
          title={showVideoFeed ? "Hide Video Feed" : "Show Video Feed"}
        >
          {showVideoFeed ? "show preview" : "hide preview"}
        </button>
      )}
      <div
        style={!start || !showVideoFeed ? { ...videoContainerStyle, ...hiddenStyle } : videoContainerStyle}
        width={640}
        height={480}
      >
        <canvas
          ref={drawCanvas}
          style={canvasStyle}
        />
        <video
          ref={videoElement}
          style={videoStyle}
        />
      </div>
    </>
  );
};
