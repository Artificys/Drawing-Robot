import { useEffect, useState, useRef } from "react";
import * as THREE from "three";

export default function useTrajectoryPlayer({ armRefs, setPenStates, setRotationSpeed, MAX_ROTATION_SPEED, canvasGroupRef, armMaxLength, armMinLength, applyPointToPenPath }) {
  const [waypoints, setWaypoints] = useState([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFps, setPlaybackFps] = useState(30);
  const [maxSpeed, setMaxSpeed] = useState(1.0); // units per frame
  const currentPos = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    if (!isPlaying || waypoints.length === 0) return;
    const interval = setInterval(() => {
      if (currentWaypointIndex >= waypoints.length) {
        setIsPlaying(false);
        clearInterval(interval);
        return;
      }

      const target = new THREE.Vector2(...waypoints[currentWaypointIndex]);
      const direction = target.clone().sub(currentPos.current);
      const distance = direction.length();

      if (distance <= maxSpeed) {
        currentPos.current.copy(target);
        moveArmTo(currentPos.current);
        setCurrentWaypointIndex(prev => prev + 1);
      } else {
        direction.normalize().multiplyScalar(maxSpeed);
        currentPos.current.add(direction);
        moveArmTo(currentPos.current);
      }
    }, 1000 / playbackFps);
    return () => clearInterval(interval);
  }, [isPlaying, waypoints, currentWaypointIndex, playbackFps, maxSpeed]);

  const moveArmTo = (targetVec2) => {
    const idx = 0; // Only controlling Arm 0 for now
    const armRef = armRefs.current[idx];
    if (!armRef?.current) return;

    const basePos = new THREE.Vector2(armRef.current.position.x, armRef.current.position.y);
    const dirVec = targetVec2.clone().sub(basePos);
    const offset = dirVec.length();
    const clampedOffset = Math.min(Math.max(offset, 0), armMaxLength);

    const angle = Math.atan2(dirVec.y, dirVec.x);
    armRef.current.rotation.z = angle;

    const frontLength = clampedOffset;
    const backLength = armMaxLength - clampedOffset;
    const frontMesh = armRef.current.children[1];
    const backMesh = armRef.current.children[2];
    if (frontMesh) {
      const baseWidth = frontMesh.geometry.parameters.width;
      frontMesh.scale.x = frontLength / baseWidth;
      frontMesh.position.x = frontLength / 2;
    }
    if (backMesh) {
      const baseWidth = backMesh.geometry.parameters.width;
      backMesh.scale.x = backLength / baseWidth;
      backMesh.position.x = -backLength / 2;
    }

    setPenStates(prev => {
      const updated = [...prev];
      updated[idx] = true;
      return updated;
    });

    // Draw dot at the tip
    const localTip = new THREE.Vector3(clampedOffset, 0, 0);
    armRef.current.localToWorld(localTip);
    applyPointToPenPath(idx, localTip);
};

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;
      // Line 1 is the canvas rotation speed as a float
      const rotationSpeed = parseFloat(lines[0]);
      if (rotationSpeed >= 0) {
        setRotationSpeed(Math.min(rotationSpeed, MAX_ROTATION_SPEED));
      }

      if (canvasGroupRef.current) {
        canvasGroupRef.current.rotation.z = 0;
      }

      const points = lines.map(line => {
        const [x, y] = line.split(/\s+/).map(Number);
        return [x, y];
      });
      setWaypoints(points);
      setCurrentWaypointIndex(0);
      currentPos.current = new THREE.Vector2(...points[0]);
    };
    reader.readAsText(file);
  };

  const togglePlayback = () => setIsPlaying(p => !p);
  const stepForward = () => {
    const next = currentWaypointIndex + 1;
    if (next < waypoints.length) {
      currentPos.current = new THREE.Vector2(...waypoints[next]);
      moveArmTo(currentPos.current);
      setCurrentWaypointIndex(next);
    }
  };

  return {
    handleFileUpload,
    togglePlayback,
    stepForward,
    setPlaybackFps,
    playbackFps,
    isPlaying,
    maxSpeed,
    setMaxSpeed
  };
}
