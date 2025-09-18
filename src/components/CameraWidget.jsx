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

const videoContainerStyle = {
  position: 'absolute',
  zIndex: 999999,
  bottom: '6rem',
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

export const CameraWidget = () => {
  const [start, setStart] = useState(false);
  const videoElement = useRef();
  const drawCanvas = useRef();
  const setVideoElement = useVideoRecognition((state) => state.setVideoElement);

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

  return (
    <>
      <button
        onClick={() => setStart((prev) => !prev)}
        style={start ? startButtonStyleActive : startButtonStyle}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = start ? '#dc2626' : '#4f46e5'; // red-700 or indigo-700
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = start ? '#ef4444' : '#818cf8'; // red-500 or indigo-400
        }}
      >
        {!start ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="1.5rem"
            height="1.5rem"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="1.5rem"
            height="1.5rem"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
            />
          </svg>
        )}
      </button>
      <div
        style={!start ? { ...videoContainerStyle, ...hiddenStyle } : videoContainerStyle}
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
