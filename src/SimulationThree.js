import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function RotatingPlatform({ rpm }) {
    const platformRef = useRef();
    useFrame(() => {
        if (platformRef.current) {
            platformRef.current.rotation.y += (rpm / 60) * (Math.PI / 30);
        }
    });
    return (
        <mesh ref={platformRef} position={[0, 0.1, 0]}>
            <boxGeometry args={[1.8, 0.1, 1.8]} />
            <meshStandardMaterial color="white" />
        </mesh>
    );
}

function Arm({ length, angle }) {
    const armRef = useRef();
    return (
        <mesh ref={armRef} position={[0, 0.15, -length / 2]} rotation={[0, (angle * Math.PI) / 180, 0]}>
            <boxGeometry args={[0.1, 0.1, length]} />
            <meshStandardMaterial color="gray" />
        </mesh>
    );
}

export default function Simulation() {
    const [robot, setRobot] = useState({
        platform: { rpm: 10 },
        arm: [
            { length: 1.8, angle: 45 },
            { length: 1.8, angle: -45 },
        ],
    });

    return (
        <Canvas camera={{ position: [3, 3, 3] }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} />
            <RotatingPlatform rpm={robot.platform.rpm} />
            {robot.arm.map((arm, i) => (
                <Arm key={i} length={arm.length} angle={arm.angle} />
            ))}
            <OrbitControls />
        </Canvas>
    );
}
