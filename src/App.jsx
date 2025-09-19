import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { Experience } from "./components/Experience";
import { useVideoRecognition } from "./hooks/useVideoRecognition";
import { Leva } from "leva";

function App() {
  const setAppStatus = useVideoRecognition((state) => state.setAppStatus);

  useEffect(() => {
    // Set initial status
    setAppStatus("MODEL_LOADING");
  }, []);

  return (
    <>
      <CameraWidget />
      <Leva collapsed />
      <Loader />
      <Canvas shadows camera={{ position: [0.25, 0.25, 2], fov: 30 }}>
        <color attach="background" args={["#333"]} />
        <Suspense>
          <Experience />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
