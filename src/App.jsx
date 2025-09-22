import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { Experience } from "./components/Experience";
import { Recorder } from "./components/Recorder";
import { CanvasCapture } from "./components/CanvasCapture";
import { useVideoRecognition } from "./hooks/useVideoRecognition";
import { Leva } from "leva";

function App() {
  const setAppStatus = useVideoRecognition((state) => state.setAppStatus);
  const recorderRef = useRef();

  useEffect(() => {
    // Set initial status
    setAppStatus("MODEL_LOADING");
  }, []);

  return (
    <>
      <CameraWidget />
      <Recorder ref={recorderRef} />
      <Leva collapsed />
      <Loader />
      <Canvas shadows camera={{ position: [0, 0.25, 2], fov: 30 }}>
        <color attach="background" args={["#333"]} />
        <Suspense>
          <Experience />
        </Suspense>
        <CanvasCapture setCanvasRef={(canvas) => {
          if (recorderRef.current) {
            recorderRef.current.setCanvasRef(canvas);
          }
        }} />
      </Canvas>
    </>
  );
}

export default App;
