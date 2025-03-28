import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function useTrajectoryPlayer({ armRefs, setPenStates, setRotationSpeed, MAX_ROTATION_SPEED, canvasGroupRef, armMaxLength, applyPointToPenPath }) {
  const [trajectoryFrames, setTrajectoryFrames] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFps, setPlaybackFps] = useState(30);

  useEffect(() => {
    if (!isPlaying || trajectoryFrames.length === 0) return;
    const interval = setInterval(() => {
      const next = (currentFrameIndex + 1) % trajectoryFrames.length;
      setCurrentFrameIndex(next);
      applyTrajectoryFrame(next);
    }, 1000 / playbackFps);
    return () => clearInterval(interval);
  }, [isPlaying, trajectoryFrames, currentFrameIndex, playbackFps]);

  const applyTrajectoryFrame = (frameIndex) => {
    const frame = trajectoryFrames[frameIndex];
    if (!frame) return;
    frame.forEach((state, idx) => {
      const armRef = armRefs.current[idx];
      if (!armRef?.current) return;
      if (!state) return; // Skip if angle or offset is undefined
      // Set rotation
      armRef.current.rotation.z = state.angle || 0; // Default to 0 if undefined

      // Set arm extension
      const frontLength = state.offset;
      const backLength = armMaxLength - frontLength;
      const frontMesh = armRef.current.children[1];
      const backMesh = armRef.current.children[2];
      const penMesh = armRef.current.children[3]; // Assuming pen is the last child
      if (frontMesh) {
        frontMesh.scale.x = frontLength / frontMesh.geometry.parameters.width;
        frontMesh.position.x = frontLength / 2;
      }
      if (backMesh) {
        backMesh.scale.x = backLength / backMesh.geometry.parameters.width;
        backMesh.position.x = -backLength / 2;
      }
      if (penMesh) {
        penMesh.position.x = frontLength; // Position the pen at the end of the arm
      }

      // Update pen state
      setPenStates(prev => {
        const updated = [...prev];
        updated[idx] = state.penDown;
        return updated;
      });

      // Emit path point if pen is down
      if (state.penDown) {
        const worldPos = new THREE.Vector3(frontLength, 0, 0);
        armRef.current.localToWorld(worldPos);
        applyPointToPenPath(idx, worldPos);
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      const canvasMatch = raw.match(/# Canvas\s*\n([+-]?\d*\.?\d+)/);
      const canvasValue = canvasMatch ? parseFloat(canvasMatch[1]) : 0.0;
      if (canvasValue >= 0) {
        setRotationSpeed(Math.min(canvasValue, MAX_ROTATION_SPEED));
      }

      if (!canvasGroupRef.current) return;
      const canvasGroup = canvasGroupRef.current;
      canvasGroup.rotation.z = 0; // Reset rotation

      const sections = raw.split(/# Arm \d+|\n{2,}/).map(s => s.trim()).filter(Boolean);
      const armTrajs = sections.map(section =>
        section.split("\n").map(line => {
          const [angle, offset, pen] = line.trim().split(/\s+/);
          return { angle: parseFloat(angle), offset: parseFloat(offset), penDown: pen === "true" };
        })
      );
      const frames = armTrajs[0].map((_, i) => armTrajs.map(arm => arm[i]));
      setTrajectoryFrames(frames);
      setCurrentFrameIndex(0);
    };
    reader.readAsText(file);
  };

  const togglePlayback = () => setIsPlaying(p => !p);
  const stepForward = () => {
    const next = (currentFrameIndex + 1) % trajectoryFrames.length;
    setCurrentFrameIndex(next);
    applyTrajectoryFrame(next);
  };

  return {
    handleFileUpload,
    togglePlayback,
    stepForward,
    setPlaybackFps,
    playbackFps,
    isPlaying
  };
}
