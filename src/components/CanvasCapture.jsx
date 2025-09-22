import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Canvas capture component to get access to the WebGL canvas
export const CanvasCapture = ({ setCanvasRef }) => {
  const { gl } = useThree();
  
  useEffect(() => {
    if (gl && gl.domElement) {
      setCanvasRef(gl.domElement);
    }
  }, [gl, setCanvasRef]);

  return null;
};