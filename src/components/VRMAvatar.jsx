import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Face, Hand, Pose } from "kalidokit";
import { useControls } from "leva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Euler, Object3D, Quaternion, Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useVideoRecognition } from "../hooks/useVideoRecognition";

const tmpVec3 = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

export const VRMAvatar = ({ avatar, ...props }) => {
  const { scene, userData } = useGLTF(
    `models/${avatar}`,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
    }
  );

  const setAppStatus = useVideoRecognition((state) => state.setAppStatus);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (userData.vrm && !modelLoaded) {
      console.log("VRM loaded:", userData.vrm);
      setModelLoaded(true);
      setAppStatus("MODEL_LOADED");
      // calling these functions greatly improves the performance
      VRMUtils.removeUnnecessaryVertices(scene);
      VRMUtils.combineSkeletons(scene);
      VRMUtils.combineMorphs(userData.vrm);

      // Disable frustum culling
      userData.vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });
    }
  }, [userData.vrm, scene, modelLoaded, setAppStatus]);

  const setResultsCallback = useVideoRecognition(
    (state) => state.setResultsCallback
  );
  const videoElement = useVideoRecognition((state) => state.videoElement);
  const riggedFace = useRef();
  const riggedPose = useRef();
  const riggedLeftHand = useRef();
  const riggedRightHand = useRef();

  const resultsCallback = useCallback(
    (results) => {
      if (!videoElement || !userData.vrm) {
        return;
      }
      if (results.faceLandmarks) {
        riggedFace.current = Face.solve(results.faceLandmarks, {
          runtime: "mediapipe", // `mediapipe` or `tfjs`
          video: videoElement,
          imageSize: { width: 640, height: 480 },
          smoothBlink: false, // smooth left and right eye blink delays
          blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
        });
      }
      if (results.za && results.poseLandmarks) {
        riggedPose.current = Pose.solve(results.za, results.poseLandmarks, {
          runtime: "mediapipe",
          video: videoElement,
        });
      }

      // Switched left and right (Mirror effect)
      if (results.leftHandLandmarks) {
        riggedRightHand.current = Hand.solve(
          results.leftHandLandmarks,
          "Right"
        );
      }
      if (results.rightHandLandmarks) {
        riggedLeftHand.current = Hand.solve(results.rightHandLandmarks, "Left");
      }
    },
    [videoElement, userData.vrm]
  );

  useEffect(() => {
    setResultsCallback(resultsCallback);
  }, [resultsCallback]);

  const {
    aa,
    ih,
    ee,
    oh,
    ou,
    blinkLeft,
    blinkRight,
    angry,
    sad,
    happy,
  } = useControls("VRM", {
    aa: { value: 0, min: 0, max: 1 },
    ih: { value: 0, min: 0, max: 1 },
    ee: { value: 0, min: 0, max: 1 },
    oh: { value: 0, min: 0, max: 1 },
    ou: { value: 0, min: 0, max: 1 },
    blinkLeft: { value: 0, min: 0, max: 1 },
    blinkRight: { value: 0, min: 0, max: 1 },
    angry: { value: 0, min: 0, max: 1 },
    sad: { value: 0, min: 0, max: 1 },
    happy: { value: 0, min: 0, max: 1 },
  });

  const lerpExpression = (name, value, lerpFactor) => {
    userData.vrm.expressionManager.setValue(
      name,
      lerp(userData.vrm.expressionManager.getValue(name), value, lerpFactor)
    );
  };

  const rotateBone = (
    boneName,
    value,
    slerpFactor,
    flip = {
      x: 1,
      y: 1,
      z: 1,
    }
  ) => {
    const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!bone) {
      console.warn(
        `Bone ${boneName} not found in VRM humanoid. Check the bone name.`
      );
      console.log("userData.vrm.humanoid.bones", userData.vrm.humanoid);
      return;
    }

    tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);
    tmpQuat.setFromEuler(tmpEuler);
    bone.quaternion.slerp(tmpQuat, slerpFactor);
  };

  useFrame((_, delta) => {
    if (!userData.vrm) {
      return;
    }
    userData.vrm.expressionManager.setValue("angry", angry);
    userData.vrm.expressionManager.setValue("sad", sad);
    userData.vrm.expressionManager.setValue("happy", happy);

    if (!videoElement) {
      [
        {
          name: "aa",
          value: aa,
        },
        {
          name: "ih",
          value: ih,
        },
        {
          name: "ee",
          value: ee,
        },
        {
          name: "oh",
          value: oh,
        },
        {
          name: "ou",
          value: ou,
        },
        {
          name: "blinkLeft",
          value: blinkLeft,
        },
        {
          name: "blinkRight",
          value: blinkRight,
        },
      ].forEach((item) => {
        lerpExpression(item.name, item.value, delta * 12);
      });
    } else {
      if (riggedFace.current) {
        const expressions = [
          {
            name: "aa",
            value: riggedFace.current.mouth && riggedFace.current.mouth.shape ? riggedFace.current.mouth.shape.A : 0,
          },
          {
            name: "ih",
            value: riggedFace.current.mouth && riggedFace.current.mouth.shape ? riggedFace.current.mouth.shape.I : 0,
          },
          {
            name: "ee",
            value: riggedFace.current.mouth && riggedFace.current.mouth.shape ? riggedFace.current.mouth.shape.E : 0,
          },
          {
            name: "oh",
            value: riggedFace.current.mouth && riggedFace.current.mouth.shape ? riggedFace.current.mouth.shape.O : 0,
          },
          {
            name: "ou",
            value: riggedFace.current.mouth && riggedFace.current.mouth.shape ? riggedFace.current.mouth.shape.U : 0,
          },
          {
            name: "blinkLeft",
            value: riggedFace.current.eye ? 1 - riggedFace.current.eye.l : 0,
          },
          {
            name: "blinkRight",
            value: riggedFace.current.eye ? 1 - riggedFace.current.eye.r : 0,
          },
        ];

        expressions.forEach((item) => {
          lerpExpression(item.name, item.value, delta * 12);
        });
      }
      // Eyes
      if (lookAtTarget.current && riggedFace.current && riggedFace.current.pupil) {
        userData.vrm.lookAt.target = lookAtTarget.current;
        lookAtDestination.current.set(
          -2 * riggedFace.current.pupil.x,
          2 * riggedFace.current.pupil.y,
          0
        );
        lookAtTarget.current.position.lerp(
          lookAtDestination.current,
          delta * 5
        );
      }

      // Body
      if (riggedFace.current && riggedFace.current.head) {
        rotateBone("neck", riggedFace.current.head, delta * 5, {
          x: 0.7,
          y: 0.7,
          z: 0.7,
        });
      }
    }
    if (riggedPose.current) {
      if (riggedPose.current.Spine) {
        rotateBone("chest", riggedPose.current.Spine, delta * 5, {
          x: 0.3,
          y: 0.3,
          z: 0.3,
        });
        rotateBone("spine", riggedPose.current.Spine, delta * 5, {
          x: 0.3,
          y: 0.3,
          z: 0.3,
        });
      }
      if (riggedPose.current.Hips && riggedPose.current.Hips.rotation) {
        rotateBone("hips", riggedPose.current.Hips.rotation, delta * 5, {
          x: 0.7,
          y: 0.7,
          z: 0.7,
        });
      }

      // LEFT ARM
      if (riggedPose.current.LeftUpperArm) {
        rotateBone("leftUpperArm", riggedPose.current.LeftUpperArm, delta * 5);
      }
      if (riggedPose.current.LeftLowerArm) {
        rotateBone("leftLowerArm", riggedPose.current.LeftLowerArm, delta * 5);
      }
      // RIGHT ARM
      if (riggedPose.current.RightUpperArm) {
        rotateBone("rightUpperArm", riggedPose.current.RightUpperArm, delta * 5);
      }
      if (riggedPose.current.RightLowerArm) {
        rotateBone("rightLowerArm", riggedPose.current.RightLowerArm, delta * 5);
      }

      if (riggedLeftHand.current) {
        rotateBone(
          "leftHand",
          {
            z: riggedPose.current && riggedPose.current.LeftHand ? riggedPose.current.LeftHand.z : 0,
            y: riggedLeftHand.current.LeftWrist ? riggedLeftHand.current.LeftWrist.y : 0,
            x: riggedLeftHand.current.LeftWrist ? riggedLeftHand.current.LeftWrist.x : 0,
          },
          delta * 12
        );
        rotateBone(
          "leftRingProximal",
          riggedLeftHand.current.LeftRingProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftRingIntermediate",
          riggedLeftHand.current.LeftRingIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftRingDistal",
          riggedLeftHand.current.LeftRingDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftIndexProximal",
          riggedLeftHand.current.LeftIndexProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftIndexIntermediate",
          riggedLeftHand.current.LeftIndexIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftIndexDistal",
          riggedLeftHand.current.LeftIndexDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftMiddleProximal",
          riggedLeftHand.current.LeftMiddleProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftMiddleIntermediate",
          riggedLeftHand.current.LeftMiddleIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftMiddleDistal",
          riggedLeftHand.current.LeftMiddleDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftThumbProximal",
          riggedLeftHand.current.LeftThumbProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftThumbMetacarpal",
          riggedLeftHand.current.LeftThumbIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftThumbDistal",
          riggedLeftHand.current.LeftThumbDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftLittleProximal",
          riggedLeftHand.current.LeftLittleProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftLittleIntermediate",
          riggedLeftHand.current.LeftLittleIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "leftLittleDistal",
          riggedLeftHand.current.LeftLittleDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
      }

      if (riggedRightHand.current) {
        rotateBone(
          "rightHand",
          {
            z: riggedPose.current && riggedPose.current.RightHand ? riggedPose.current.RightHand.z : 0,
            y: riggedRightHand.current.RightWrist ? riggedRightHand.current.RightWrist.y : 0,
            x: riggedRightHand.current.RightWrist ? riggedRightHand.current.RightWrist.x : 0,
          },
          delta * 12
        );
        rotateBone(
          "rightRingProximal",
          riggedRightHand.current.RightRingProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightRingIntermediate",
          riggedRightHand.current.RightRingIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightRingDistal",
          riggedRightHand.current.RightRingDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightIndexProximal",
          riggedRightHand.current.RightIndexProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightIndexIntermediate",
          riggedRightHand.current.RightIndexIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightIndexDistal",
          riggedRightHand.current.RightIndexDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightMiddleProximal",
          riggedRightHand.current.RightMiddleProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightMiddleIntermediate",
          riggedRightHand.current.RightMiddleIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightMiddleDistal",
          riggedRightHand.current.RightMiddleDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightThumbProximal",
          riggedRightHand.current.RightThumbProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightThumbMetacarpal",
          riggedRightHand.current.RightThumbIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightThumbDistal",
          riggedRightHand.current.RightThumbDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightLittleProximal",
          riggedRightHand.current.RightLittleProximal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightLittleIntermediate",
          riggedRightHand.current.RightLittleIntermediate || { x: 0, y: 0, z: 0 },
          delta * 12
        );
        rotateBone(
          "rightLittleDistal",
          riggedRightHand.current.RightLittleDistal || { x: 0, y: 0, z: 0 },
          delta * 12
        );
      }
    }

    userData.vrm.update(delta);
  });

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const camera = useThree((state) => state.camera);
  const lookAtTarget = useRef();
  useEffect(() => {
    lookAtTarget.current = new Object3D();
    camera.add(lookAtTarget.current);
  }, [camera]);

  return (
    <group {...props}>
      <primitive
        object={scene}
        rotation-y={avatar !== "3636451243928341470.vrm" ? Math.PI : 0}
      />
    </group>
  );
};
