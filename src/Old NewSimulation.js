import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const INCH = 1;
const DEFAULT_FRAME_SIZE = 29 * INCH;
const FRAME_THICKNESS = 1.5 * INCH;
const HUB_DIA = 4.75 * INCH;
const ARM_WIDTH = 1 * INCH;
const DEFAULT_ROTATION_SPEED = 0.01;
const DEFAULT_CANVAS_WIDTH = 20 * INCH;
const DEFAULT_ARM_MAX_LENGTH = 18 * INCH;
const DEFAULT_ARM_STARTING_POSITION = 5 * INCH;
const DEFAULT_ARM_OFFSET_LIMIT = 2 * INCH;

function SpinningCanvas({ speed, width, penPaths, groupRef }) {
    const ref = groupRef;
    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.z += speed;
        }
    });
    return (
        <group ref={ref} position={[0, 0, 0.2]}>
            <mesh>
                <planeGeometry args={[width, width]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} />
            </mesh>
            {penPaths.map((segments, idx) => (
                segments.map((points, segIdx) => {
                    if (points.length < 2) return null;
                    const geometry = new THREE.BufferGeometry();
                    const positions = new Float32Array(points.map(p => [p[0], p[1], 0.21]).flat());
                    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    const material = new THREE.LineBasicMaterial({ color: 'black' });
                    const line = new THREE.Line(geometry, material);
                    return <primitive object={line} key={`${idx}-${segIdx}`} />;
                })
            )).flat()}
        </group>
    );
}

function Frame({ size }) {
    return (
        <group>
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[size, size]} />
                <meshBasicMaterial color="gray" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0, 0.1]}>
                <planeGeometry args={[size - 2 * FRAME_THICKNESS, size - 2 * FRAME_THICKNESS]} />
                <meshBasicMaterial color="#222" side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function Arm({ position, armMaxLength, armOffsetLimit, armStartingPosition, penDown, onPenMove, canvasGroupRef }) {
    const hubRef = useRef();
    const armRef = useRef();
    const groupRef = useRef();
    const [armFrontLength, setArmFrontLength] = useState(armStartingPosition);
    const [armBackLength, setArmBackLength] = useState(armMaxLength - armStartingPosition);
    const [angle, setAngle] = useState(() => {
        const center = new THREE.Vector2(0, 0);
        const hubVec = new THREE.Vector2(position[0], position[1]);
        return Math.atan2(center.y - hubVec.y, center.x - hubVec.x);
    });
    const [isDragging, setIsDragging] = useState(false);
    const [grabOffset, setGrabOffset] = useState(0);
    const { camera, gl } = useThree();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const rect = gl.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const plane = new THREE.Plane();
            plane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 0, 0.3),
                new THREE.Vector3(...position)
            );

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                const localVector = intersection.clone().sub(new THREE.Vector3(...position));
                const newAngle = Math.atan2(localVector.y, localVector.x);
                setAngle(newAngle);

                const directionVector = new THREE.Vector3(Math.cos(newAngle), Math.sin(newAngle), 0);
                const projected = localVector.projectOnVector(directionVector);

                const newLength = projected.length() + grabOffset;
                if (newLength > armOffsetLimit + (HUB_DIA / 2) && newLength < armMaxLength - armOffsetLimit - (HUB_DIA / 2)) {
                    setArmFrontLength(newLength);
                    setArmBackLength(armMaxLength - newLength);
                }
            }
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [camera, gl, position, isDragging, grabOffset, armMaxLength, armOffsetLimit]);

    useFrame(() => {
        if (penDown && groupRef.current && canvasGroupRef.current) {
            const worldPosition = new THREE.Vector3();
            groupRef.current.localToWorld(worldPosition.set(armFrontLength, 0, 0));
            const canvasLocal = worldPosition.clone();
            canvasGroupRef.current.worldToLocal(canvasLocal);
            onPenMove(canvasLocal);
        }
    });

    const handlePointerDown = (e) => {
        e.stopPropagation();
        const localPoint = e.point.clone().sub(new THREE.Vector3(...position));
        const currentDirection = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        const projected = localPoint.projectOnVector(currentDirection);
        setGrabOffset(armFrontLength - projected.length());
        setIsDragging(true);
    };

    return (
        <group ref={groupRef} position={position} rotation={[0, 0, angle]}>
            <mesh ref={hubRef}>
                <circleGeometry args={[HUB_DIA / 2]} />
                <meshBasicMaterial color="black" side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={armRef} position={[armFrontLength / 2, 0, 0.1]} onPointerDown={handlePointerDown}>
                <boxGeometry args={[armFrontLength, ARM_WIDTH, 0.1]} />
                <meshBasicMaterial color="blue" />
            </mesh>
            <mesh ref={armRef} position={[-armBackLength / 2, 0, 0.1]}>
                <boxGeometry args={[armBackLength, ARM_WIDTH, 0.1]} />
                <meshBasicMaterial color="gray" />
            </mesh>
            <mesh position={[armFrontLength, 0, 0.11]}>
                <circleGeometry args={[ARM_WIDTH / 2]} />
                <meshBasicMaterial color={penDown ? "green" : "red"} />
            </mesh>
        </group>
    );
}

export default function Simulation() {
    const [frameSize, setFrameSize] = useState(DEFAULT_FRAME_SIZE);
    const [rotationSpeed, setRotationSpeed] = useState(DEFAULT_ROTATION_SPEED);
    const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);
    const [armMaxLength, setArmMaxLength] = useState(DEFAULT_ARM_MAX_LENGTH);
    const [armOffsetLimit, setArmOffsetLimit] = useState(DEFAULT_ARM_OFFSET_LIMIT);
    const [armStartingPosition, setArmStartingPosition] = useState(DEFAULT_ARM_STARTING_POSITION);
    const [penStates, setPenStates] = useState([false, false, false, false]);
    const [previousPenStates, setPreviousPenStates] = useState([false, false, false, false]);
    const [penPaths, setPenPaths] = useState([[], [], [], []]);
    const canvasGroupRef = useRef();

    const hubOffset = (frameSize / 2) - (HUB_DIA / 2);
    const hubPositions = [
        [hubOffset, hubOffset, 0.3],
        [-hubOffset, hubOffset, 0.3],
        [-hubOffset, -hubOffset, 0.3],
        [hubOffset, -hubOffset, 0.3]
    ];

    const togglePen = (index) => {
        const updated = [...penStates];
        updated[index] = !updated[index];
        setPenStates(updated);
        setPreviousPenStates(p => {
            const next = [...p];
            next[index] = penStates[index];
            return next;
        });
    };

    const updatePath = (index, point) => {
        if (!penStates[index]) return;

        setPenPaths(paths => {
            const newPaths = paths.map((segments, i) => {
                if (i !== index) return segments;
                const wasUp = !previousPenStates[i];
                if (wasUp || segments.length === 0) {
                    // Start a new segment
                    return [...segments, [point.toArray()]];
                } else {
                    // Append to last segment
                    const lastSegment = segments[segments.length - 1];
                    const updatedSegment = [...lastSegment, point.toArray()];
                    return [...segments.slice(0, -1), updatedSegment];
                }
            });
            setPreviousPenStates(p => {
                const updated = [...p];
                updated[index] = true;
                return updated;
            });
            return newPaths;
        });
    };

    return (
        <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#222" }}>
            <div style={{ width: "50%", height: "100%" }}>
                <Canvas orthographic camera={{ zoom: 10, position: [0, 0, 10] }}>
                    <Frame size={frameSize} />
                    <SpinningCanvas
                        speed={rotationSpeed}
                        width={canvasWidth}
                        penPaths={penPaths}
                        groupRef={canvasGroupRef}
                    />
                    {hubPositions.map((pos, idx) => (
                        <Arm
                            key={idx}
                            position={pos}
                            armMaxLength={armMaxLength}
                            armOffsetLimit={armOffsetLimit}
                            armStartingPosition={armStartingPosition}
                            penDown={penStates[idx]}
                            onPenMove={(p) => updatePath(idx, p)}
                            canvasGroupRef={canvasGroupRef}
                        />
                    ))}
                </Canvas>
            </div>
            <div style={{ width: "50%", padding: "1rem", color: "white" }}>
                <h2>Controls</h2>
                <label>Frame Size:
                    <input type="number" value={frameSize} onChange={(e) => setFrameSize(parseFloat(e.target.value))} />
                </label>
                <br />
                <label>Canvas Rotation Speed:
                    <input type="range" min="0" max="0.1" step="0.001" value={rotationSpeed} onChange={(e) => setRotationSpeed(parseFloat(e.target.value))} />
                </label>
                <br />
                <label>Canvas Width:
                    <input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(parseFloat(e.target.value))} />
                </label>
                <br />
                <label>Arm Max Length:
                    <input type="number" value={armMaxLength} onChange={(e) => setArmMaxLength(parseFloat(e.target.value))} />
                </label>
                <br />
                <label>Arm Offset Limit:
                    <input type="number" value={armOffsetLimit} onChange={(e) => setArmOffsetLimit(parseFloat(e.target.value))} />
                </label>
                <br />
                <label>Arm Starting Position:
                    <input type="number" value={armStartingPosition} onChange={(e) => setArmStartingPosition(parseFloat(e.target.value))} />
                </label>
                <br />
                <h3>Pen Toggles</h3>
                {penStates.map((state, i) => (
                    <div key={i}>
                        <button onClick={() => togglePen(i)}>
                            Pen {i + 1}: {state ? "Down" : "Up"}
                        </button>
                    </div>
                ))}
                <hr />
                <h3>Canvas Preview</h3>
                <div style={{ width: '100%', height: '400px', background: '#111' }}>
                    <Canvas orthographic camera={{ zoom: 10, position: [0, 0, 10] }}>
                        <group position={[0, 0, 0.2]}>
                            <mesh>
                                <planeGeometry args={[canvasWidth, canvasWidth]} />
                                <meshBasicMaterial color="white" side={THREE.DoubleSide} />
                            </mesh>
                            {penPaths.map((segments, idx) => (
                                segments.map((points, segIdx) => {
                                    if (points.length < 2) return null;
                                    const geometry = new THREE.BufferGeometry();
                                    const positions = new Float32Array(points.map(p => [p[0], p[1], 0.21]).flat());
                                    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                                    const material = new THREE.LineBasicMaterial({ color: 'black' });
                                    const line = new THREE.Line(geometry, material);
                                    return <primitive object={line} key={`${idx}-${segIdx}`} />;
                                })
                            )).flat()}
                        </group>
                    </Canvas>
                </div>
            </div>
        </div>
    );
}
