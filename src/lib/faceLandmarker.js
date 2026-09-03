// src/lib/faceLandmarker.js
//
// Thin wrapper around MediaPipe Tasks Vision's FaceLandmarker for CoopGuard's
// face verification step. The WASM runtime and model are loaded lazily (only
// once face verification actually starts) so they never slow down the app's
// initial load, and this module exposes a small helper that turns a raw
// detection result into the signals the verification UI needs: whether a
// face is present, whether it's roughly centered, whether an eye is
// blinking, and which way (if any) the head is turned.
//
// The model + WASM assets are fetched at runtime from MediaPipe's public CDN
// — nothing is bundled or shipped by CoopGuard, and no image or face data
// ever leaves the browser: detection runs entirely on-device.

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const PACKAGE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Landmark indices from MediaPipe's canonical 468/478-point face mesh.
const NOSE_TIP = 1;
const LEFT_FACE_EDGE = 234;
const RIGHT_FACE_EDGE = 454;

// How far (as a fraction of face width) the nose tip has to drift from
// center before we call it a deliberate head turn, vs. natural jitter.
const YAW_TURN_THRESHOLD = 0.06;
const YAW_FORWARD_THRESHOLD = 0.035;
const BLINK_THRESHOLD = 0.45;

let landmarkerPromise = null;

// Loads (once, cached) and returns a ready FaceLandmarker running in VIDEO mode.
// Tries the GPU delegate first for speed, falling back to CPU if the device
// or browser doesn't support it.
export function loadFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      const commonOptions = {
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      };
      try {
        return await FaceLandmarker.createFromOptions(vision, {
          ...commonOptions,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        });
      } catch (gpuErr) {
        return await FaceLandmarker.createFromOptions(vision, {
          ...commonOptions,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        });
      }
    })().catch((err) => {
      landmarkerPromise = null; // allow a retry instead of caching a permanent failure
      throw err;
    });
  }
  return landmarkerPromise;
}

function blendshapeScore(result, categoryName) {
  const shapes = result.faceBlendshapes && result.faceBlendshapes[0];
  if (!shapes) return 0;
  const cat = shapes.categories.find((c) => c.categoryName === categoryName);
  return cat ? cat.score : 0;
}

// Reduces a raw FaceLandmarkerResult to the simple signals the verification
// UI cares about. Returns null when no face is present in the frame.
export function analyzeFace(result) {
  const landmarks = result.faceLandmarks && result.faceLandmarks[0];
  if (!landmarks || landmarks.length === 0) return null;

  const nose = landmarks[NOSE_TIP];
  const leftEdge = landmarks[LEFT_FACE_EDGE];
  const rightEdge = landmarks[RIGHT_FACE_EDGE];
  const faceWidth = Math.max(Math.abs(rightEdge.x - leftEdge.x), 0.001);

  // -0.5 (nose at the left face edge) .. +0.5 (nose at the right face edge);
  // ~0 means facing the camera. Detection runs on the raw camera frame,
  // which is NOT mirrored (only the on-screen <video> preview is, via CSS,
  // for a natural "look in a mirror" feel) — so this sign is what a face
  // pointed at the camera actually produces. If left/right ever read
  // backwards on a real device, flip the comparisons below.
  const yawOffset = (nose.x - leftEdge.x) / faceWidth - 0.5;

  const blinkScore = Math.max(
    blendshapeScore(result, "eyeBlinkLeft"),
    blendshapeScore(result, "eyeBlinkRight")
  );

  return {
    present: true,
    yawOffset,
    blinkScore,
    turnedLeft: yawOffset < -YAW_TURN_THRESHOLD,
    turnedRight: yawOffset > YAW_TURN_THRESHOLD,
    facingForward: Math.abs(yawOffset) < YAW_FORWARD_THRESHOLD,
    blinking: blinkScore > BLINK_THRESHOLD,
  };
}

