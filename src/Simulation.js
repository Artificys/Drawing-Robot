import { motion, useMotionTemplate, useMotionValue, useTime } from "framer-motion";
import { useState, useRef, useEffect } from "react";

import "./Simulation.css";
import { use } from "react";

/** Assume all numbers are in inches */

function calculateBoundingBox(arm, frame, additionalOffset = 0) {
    /** Bounding box is a square that encompasses the entire robot
     *  Assume that the center of the frame is at the origin
     *  The length of the arm subtracted by the minimum position of the arm is the offset distance between the frame and the bounding box
     */
    const offset = arm[0].length - arm[0].minPosition;
    return {
        width: frame.width + 2 * offset + 2 * additionalOffset,
        height: frame.height + 2 * offset + 2 * additionalOffset,
    };
};

function initializeRobot() {
    const generalOffset = 2; // 2 inches
    const frame = {
        width: 26,
        height: 26,
        thickness: 1.5,
    };
    const platform = {
        // width: frame.width / Math.sqrt(2) - generalOffset,
        // height: frame.width / Math.sqrt(2) - generalOffset,
        width: 18,
        height: 18,
        rpm: 10,
        minRpm: 1,
        maxRpm: 10000,
    };

    const armLength = 18;
    const arm = [];
    for (let i = 0; i < 4; i++) {
        const armAngle = 45 - i * 90;
        arm.push({
            length: armLength,
            startAngle: armAngle,
            maxAngle: armAngle + 45,
            minAngle: armAngle - 45,
            startPosition: armLength / 2,
            maxPosition: armLength - 3,
            minPosition: 3,
            angle: armAngle,
            position: armLength - 5,
            thickness: 1,
            penSize: 1,
            drawingEnabled: false,
            intervalRef: null,
        });
    }
    const boundingBox = {
        width: calculateBoundingBox(arm, frame, generalOffset).width,
        height: calculateBoundingBox(arm, frame, generalOffset).height,
    };

    // console.log("frame", frame);
    // console.log("platform", platform);
    // console.log("arm", arm);
    // console.log("boundingBox", boundingBox);

    return {
        frame,
        platform,
        arm,
        boundingBox,
    };
};

export default function SpinningBoxWithCanvas() {
    const [drawing, setDrawing] = useState([[], [], [], []]);
    const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1000 });
    const [robot, setRobot] = useState(initializeRobot);

    const canvasRef = useRef(null);
    const svgRef = useRef(null);

    const armIntervalRef1 = useRef(null);
    const armIntervalRef2 = useRef(null);
    const armIntervalRef3 = useRef(null);
    const armIntervalRef4 = useRef(null);

    // useEffect(() => {
    //     window.alert("Hello! Please draw on the canvas below. You can undo with Ctrl+Z and redo with Ctrl+Shift+Z.");
    // }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawing.forEach((armDrawing, i) => {
            if (i == 0) ctx.strokeStyle = "black";
            else if (i == 1) ctx.strokeStyle = "red";
            else if (i == 2) ctx.strokeStyle = "green";
            else if (i == 3) ctx.strokeStyle = "blue";
            ctx.lineWidth = 2;
            ctx.beginPath();
            armDrawing.forEach(([x, y], i) => {
                if (x === -1 && y === -1) {
                    ctx.stroke();
                    ctx.beginPath();
                } else {
                    ctx.lineTo(x * canvas.width / robot.platform.width, y * canvas.height / robot.platform.height);
                }
            });
            ctx.stroke();
        });
    }, [drawing]);

    // useEffect(() => {
    //     const handleKeyDown = (e) => {

    //         if (e.ctrlKey && e.key === "z") {
    //             if (drawing.length > 0) {
    //                 // Find the last [-1, -1] pair before the end
    //                 let lastIndex = drawing.length - 2;
    //                 while (lastIndex > 0) {
    //                     if (drawing[lastIndex][0] === -1 && drawing[lastIndex][1] === -1) {
    //                         break;
    //                     }
    //                     lastIndex--;
    //                 }
    //                 // If we found a [-1, -1] pair, keep everything before it
    //                 const newDrawing = lastIndex > 0 ? drawing.slice(0, lastIndex + 1) : [];
    //                 setRedoStack([...redoStack, drawing]);
    //                 setDrawing(newDrawing);
    //                 setUndoStack([...undoStack, drawing]);
    //             }
    //         } else if (e.ctrlKey && e.shiftKey && e.key === "Z") {
    //             if (redoStack.length > 0) {
    //                 setDrawing(redoStack[redoStack.length - 1]);
    //                 setRedoStack(redoStack.slice(0, redoStack.length - 1));
    //                 setUndoStack([...undoStack, drawing]);
    //             }
    //         }
    //     };

    //     window.addEventListener("keydown", handleKeyDown);
    //     return () => window.removeEventListener("keydown", handleKeyDown);
    // }, [drawing, undoStack, redoStack]);


    // /** Absolute Mouse position within the canvas:
    //  *  x = (e.clientX - rect.left) / rect.width * canvas.width
    //  *  y = (e.clientY - rect.top) / rect.height * canvas.height
    //  * 
    //  * We don't want this though in order to mime the drawing on the robot platform
    //  * We want a (x, y) based solely on the robot platform
    //  */
    // const handleMouseMove = (e) => {
    //     if (e.buttons !== 1) return;
    //     const canvas = canvasRef.current;
    //     if (!canvas) return;
    //     const rect = canvas.getBoundingClientRect();

    //     const x = (e.clientX - rect.left) / rect.width * canvas.width / 100 * (robot.platform.width / 10);
    //     const y = (e.clientY - rect.top) / rect.height * canvas.height / 100 * (robot.platform.height / 10);

    //     setUndoStack([...undoStack, drawing]);
    //     setDrawing([...drawing, [x, y]]);
    //     setRedoStack([]);
    // };

    // const handleMouseUp = (e) => {
    //     const canvas = canvasRef.current;
    //     if (!canvas) return;
    //     const x = -1;
    //     const y = -1;
    //     setUndoStack([...undoStack, drawing]);
    //     setDrawing([...drawing, [x, y]]);
    //     setRedoStack([]);

    // }

    const [dragging, setDragging] = useState(-1);

    const startDrag = (e, index) => {
        setDragging(index);
    };

    const stopDrag = () => {
        setDragging(-1);
    };

    const updateMovement = (mouseX, mouseY, pivotX, pivotY, index) => {
        const arm = robot.arm[index];

        // Vector from pivot to mouse
        const dx = mouseX - pivotX;
        const dy = mouseY - pivotY;

        // Calculate new angle from pivot to mouse and add 180 degrees since we're pulling from behind
        let newAngle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 180;

        // Calculate new position as distance from pivot to mouse
        let newPosition = Math.sqrt(dx * dx + dy * dy) / 10;
        newPosition = Math.min(Math.max(newPosition, arm.minPosition), arm.maxPosition);

        newAngle = (newAngle % 360)

        // If angle is more than 180 degrees away from the start angle, flip it
        if (Math.abs(newAngle - arm.angle) > 180) {
            newAngle = newAngle > arm.angle ? newAngle - 360 : newAngle + 360;
        }

        // Clamp to min/max range
        newAngle = Math.min(Math.max(newAngle, arm.minAngle), arm.maxAngle);

        setRobot({
            ...robot,
            arm: [...robot.arm.slice(0, index), { ...arm, angle: newAngle, position: newPosition }, ...robot.arm.slice(index + 1)]
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (dragging === -1) return;
            const xNeg = Math.pow(-1, Math.floor(dragging / 2));
            const yNeg = Math.pow(-1, Math.floor((dragging + 1) / 2));
            const pivotX = xNeg * robot.frame.width / 2 * 10
            const pivotY = yNeg * robot.frame.height / 2 * 10


            const svg = svgRef.current;
            if (!svg) return;
            // Mouse position
            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const transformedPoint = point.matrixTransform(svg.getScreenCTM().inverse());
            const mouseX = transformedPoint.x;
            const mouseY = transformedPoint.y;

            updateMovement(mouseX, mouseY, pivotX, pivotY, dragging);
        };

        const handleMouseUp = () => {
            stopDrag();
        };

        const handleKeyDown = (e) => {
            if (dragging === -1) return;

            if (e.code === "Space") {
                e.preventDefault();
                setRobot({
                    ...robot,
                    arm: robot.arm.map((arm, i) => i === dragging ? { ...arm, drawingEnabled: !arm.drawingEnabled } : arm)
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging, robot]);


    const updateDrawing = (newDrawing, arm, i) => {

        if (arm.drawingEnabled) {
            const xNeg = Math.pow(-1, Math.floor(i / 2));
            const yNeg = Math.pow(-1, Math.floor((i + 1) / 2));
            const pivotX = xNeg * robot.frame.width / 2 * 10;
            const pivotY = yNeg * robot.frame.height / 2 * 10;

            const tipX = pivotY + Math.sin(arm.angle * Math.PI / 180) * (-arm.position * 10);
            const tipY = pivotX + Math.cos(arm.angle * Math.PI / 180) * (-arm.position * 10);

            let platformAngle = document
                .getElementById("platform")
                ?.getAttribute("style")
                ?.match(/rotate\(([^)]+)\)/);

            platformAngle = platformAngle ? parseFloat(platformAngle[1].replace("deg", "")) : 0;

            const platformX = tipX * Math.sin(platformAngle * Math.PI / 180) + tipY * Math.cos(platformAngle * Math.PI / 180);
            const platformY = tipX * Math.cos(platformAngle * Math.PI / 180) - tipY * Math.sin(platformAngle * Math.PI / 180);
            const platformPositionX = platformX / 10 + robot.platform.width / 2;
            const platformPositionY = platformY / 10 + robot.platform.height / 2;

            if (newDrawing.length > 0 && Math.abs(newDrawing[newDrawing.length - 1][0] - platformPositionX) < 0.1 && Math.abs(newDrawing[newDrawing.length - 1][1] - platformPositionY) < 0.1) {
                return newDrawing;
            }

            // Transform position relative to platform's rotation
            const platformRotation = platformAngle * Math.PI / 180;
            const relativeX = (platformPositionX - robot.platform.width / 2) * Math.sin(-platformRotation) + (platformPositionY - robot.platform.height / 2) * Math.cos(-platformRotation) + robot.platform.width / 2;
            const relativeY = (platformPositionX - robot.platform.width / 2) * Math.cos(-platformRotation) - (platformPositionY - robot.platform.height / 2) * Math.sin(-platformRotation) + robot.platform.height / 2;

            if (relativeX < 0 || relativeX > robot.platform.width || relativeY < 0 || relativeY > robot.platform.height) {
                return newDrawing;
            }
            // console.log("platformPositionX", platformPositionX, "platformPositionY", platformPositionY);
            // console.log("relativeX", relativeX, "relativeY", relativeY);

            newDrawing.push([platformPositionX, platformPositionY]);
        }

        return newDrawing;
    };


    useEffect(() => {
        armIntervalRef1.current = setInterval(() => {
            setDrawing((prevDrawing) => {
                let newDrawing = [...prevDrawing[0]]
                let updated = updateDrawing(newDrawing, robot.arm[0], 0);
                return [updated, prevDrawing[1], prevDrawing[2], prevDrawing[3]];
            });
        }, 100);

        return () => clearInterval(armIntervalRef1.current);
    }, [robot.arm[0]]);

    useEffect(() => {
        armIntervalRef2.current = setInterval(() => {
            setDrawing((prevDrawing) => {
                let newDrawing = [...prevDrawing[1]]
                let updated = updateDrawing(newDrawing, robot.arm[1], 1);
                return [prevDrawing[0], updated, prevDrawing[2], prevDrawing[3]];
            });

            // console.log("drawing[1].length", drawing[1].length);
            // if (drawing[1].length > 10 * (robot.arm[1].maxPosition - robot.arm[1].position)) {
            //     setRobot((prevRobot) => {
            //         return { ...prevRobot, arm: [...prevRobot.arm.slice(0, 1), { ...prevRobot.arm[1], position: prevRobot.arm[1].position > prevRobot.arm[1].minPosition ? (prevRobot.arm[1].position - 1) : prevRobot.arm[1].minPosition }, ...prevRobot.arm.slice(2)] }
            //     });
            // }

        }, 100);



        return () => clearInterval(armIntervalRef2.current);
    }, [robot.arm[1]]);

    useEffect(() => {
        armIntervalRef3.current = setInterval(() => {
            setDrawing((prevDrawing) => {
                let newDrawing = [...prevDrawing[2]]
                let updated = updateDrawing(newDrawing, robot.arm[2], 2);
                return [prevDrawing[0], prevDrawing[1], updated, prevDrawing[3]];
            });
        }, 100);

        return () => clearInterval(armIntervalRef3.current);
    }, [robot.arm[2]]);

    useEffect(() => {
        armIntervalRef4.current = setInterval(() => {
            setDrawing((prevDrawing) => {
                let newDrawing = [...prevDrawing[3]]
                let updated = updateDrawing(newDrawing, robot.arm[3], 3);
                return [prevDrawing[0], prevDrawing[1], prevDrawing[2], updated];
            });
        }, 100);

        return () => clearInterval(armIntervalRef4.current);
    }, [robot.arm[3]]);

    return (
        <div className="simulation-page">
            <div className="simulation-container">
                {/* viewBox is { x0, y0, width, height } */}
                <svg
                    ref={svgRef}
                    className="simulation"
                    width={canvasSize.width}
                    height={canvasSize.height}
                    viewBox={`${-robot.boundingBox.width / 2 * 10} ${-robot.boundingBox.height / 2 * 10} ${robot.boundingBox.width * 10} ${robot.boundingBox.height * 10}`}
                >
                    <rect
                        id="frame"
                        x={-(robot.frame.width + robot.frame.thickness) / 2 * 10}
                        y={-(robot.frame.height + robot.frame.thickness) / 2 * 10}
                        width={(robot.frame.width + robot.frame.thickness) * 10}
                        height={(robot.frame.height + robot.frame.thickness) * 10}
                        stroke="silver"
                        strokeWidth={robot.frame.thickness * 10}
                        fill="none"
                    />
                    <motion.g
                        id="platform"
                        style={{
                            x: -10 * (robot.platform.width / 2),
                            y: -10 * (robot.platform.height / 2),
                            // animation: `spin ${robot.platform.rpm / 2}s linear infinite`,
                            // transformOrigin: `${robot.platform.width / 2 * 10}px ${robot.platform.height / 2 * 10}px`,
                            // transform: `translate(${-robot.platform.width / 2 * 10}px, ${-robot.platform.height / 2 * 10}px) rotate(360deg)`,
                            // translate: `${-robot.platform.width / 2 * 10}px ${-robot.platform.height / 2 * 10}px`,
                        }}
                        width={robot.platform.width * 10}
                        height={robot.platform.height * 10}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                    >
                        <rect
                            id="platform"
                            x="0"
                            y="0"
                            width={robot.platform.width * 10}
                            height={robot.platform.height * 10}
                            stroke="black"
                            strokeWidth="1"
                            fill="white"
                        />

                        {drawing.map((armDrawing, i) => {
                            return (
                                <g key={"armDrawing" + i}>
                                    {armDrawing.map(([x, y], j) => (
                                        <circle
                                            key={"armDrawing" + i + "point" + j}
                                            cx={x * 10}
                                            cy={y * 10}
                                            r="1"
                                            fill="black"
                                        />
                                    ))}
                                </g>
                            );
                        })}
                    </motion.g>

                    <rect
                        id="bounding-box"
                        x={-(robot.boundingBox.width - 1) / 2 * 10}
                        y={-(robot.boundingBox.height - 1) / 2 * 10}
                        width={(robot.boundingBox.width - 1) * 10}
                        height={(robot.boundingBox.height - 1) * 10}
                        stroke="red"
                        strokeWidth="1"
                        strokeDasharray={"5,5"}
                        fill="none"
                    />

                    {/* Inch Reference */}
                    <g>
                        <rect
                            x={-(robot.boundingBox.width / 2 - 3) * 10}
                            y={-(robot.boundingBox.height / 2 - 3) * 10}
                            width="10"
                            height="10"
                            stroke="black"
                            strokeWidth="1"
                            fill="none"
                        />
                        <text
                            x={-(robot.boundingBox.width / 2 - 3) * 10 - 2}
                            y={-(robot.boundingBox.height / 2 - 3) * 10 - 5}
                            fontSize="10"
                            fill="black"
                            style={{ userSelect: "none" }}
                        >
                            1in
                        </text>
                    </g>

                    {/* Arm */}
                    {robot.arm.map((arm, i) => {
                        const xNeg = Math.pow(-1, Math.floor(i / 2));
                        const yNeg = Math.pow(-1, Math.floor((i + 1) / 2));
                        return (
                            <motion.g
                                key={"arm" + i}
                                style={{
                                    originX: "0",
                                    originY: "0",
                                    x: xNeg * robot.frame.width / 2 * 10,
                                    y: yNeg * robot.frame.height / 2 * 10
                                }}
                                initial={false}
                                animate={{ rotate: arm.angle }}
                                transition={{ duration: 0.01, ease: "linear" }}
                            // transformTemplate={({ rotate }) => `rotate(${rotate}deg)`}

                            >


                                {/* Arm Graphics */}
                                <motion.rect
                                    id={"arm" + i}
                                    y="-5"
                                    fill="gray"

                                    initial={{ x: -arm.position * 10, width: arm.position * 10, height: arm.thickness * 10 }}
                                    animate={{ x: -arm.position * 10, width: arm.length * 10, height: arm.thickness * 10 }}
                                    transition={{ duration: 0.01, ease: "linear" }}
                                />
                                {/* Draggable Area (Invisible but Clickable) */}
                                <motion.rect
                                    x={-arm.position * 10}
                                    y="-15"
                                    width={arm.length * 10 + 20}
                                    height="30"
                                    fill="transparent"
                                    style={{ cursor: "grab" }}
                                    onPointerDown={(e) => startDrag(e, i)}
                                />
                                <circle id={"pen" + i} cx={-arm.position * 10} cy="0" r="5" fill="black" />
                                <rect id="arm-hub" x="-12.5" y="-12.5" width="25" height="25" fill="black" />
                            </motion.g>
                        );
                    })}
                </svg>
            </div>
            <div className="control-board">
                <div className="controls">
                    <div>
                        <h3 style={{ display: "flex", gap: "10px" }}>
                            <div>Platform</div>
                            <div
                                style={{
                                    cursor: "pointer",
                                    color: "red"
                                }}
                                onClick={() => setDrawing([[], [], [], []])}
                            >
                                Clear
                            </div>
                        </h3>
                        <label>
                            Speed: <input
                                type="number"
                                min={robot.platform.minRpm}
                                max={robot.platform.maxRpm}
                                step="1"
                                value={robot.platform.rpm}
                                onChange={(e) => setRobot({ ...robot, platform: { ...robot.platform, rpm: Number(e.target.value) } })}
                            />
                        </label>
                        <label>
                            Size: <input
                                type="number"
                                min="2"
                                max={robot.frame.width - 2}
                                step="1"
                                value={robot.platform.width}
                                onChange={(e) => setRobot({ ...robot, platform: { ...robot.platform, width: Number(e.target.value), height: Number(e.target.value) } })}
                            />in
                        </label>
                    </div>
                    <div>
                        <h3>Frame</h3>
                        <label>
                            Size: <input
                                type="number"
                                min="20"
                                max="60"
                                step="1"
                                value={robot.frame.width}
                                onChange={(e) => setRobot({ ...robot, boundingBox: { width: calculateBoundingBox(robot.arm, robot.frame, 2).width, height: calculateBoundingBox(robot.arm, robot.frame, 2).height }, frame: { ...robot.frame, width: Number(e.target.value), height: Number(e.target.value) } })}
                            />in
                        </label>
                        <label>
                            Thickness: <input
                                type="number"
                                min="1"
                                max="4"
                                step="0.5"
                                value={robot.frame.thickness}
                                onChange={(e) => setRobot({ ...robot, frame: { ...robot.frame, thickness: Number(e.target.value) } })}
                            />in
                        </label>
                    </div>
                    <div>
                        <h3>Arms</h3>
                        <label>
                            Length: <input
                                type="number"
                                min="10"
                                max="60"
                                step="1"
                                value={robot.arm[0].length}
                                onChange={(e) => {
                                    setRobot({ ...robot, boundingBox: { width: calculateBoundingBox(robot.arm, robot.frame, 2).width, height: calculateBoundingBox(robot.arm, robot.frame, 2).height }, arm: robot.arm.map((arm) => ({ ...arm, length: Number(e.target.value), maxPosition: Number(e.target.value) - arm.minPosition, position: Number(e.target.value) - arm.minPosition })) })
                                }}
                            />in
                        </label>
                        <label>
                            Limit: <input
                                type="number"
                                min="0.5"
                                max={robot.arm[0].length / 2 - 1.5}
                                step="0.5"
                                value={robot.arm[0].length - robot.arm[0].maxPosition}
                                onChange={(e) => setRobot({ ...robot, arm: robot.arm.map((arm) => ({ ...arm, maxPosition: arm.length - Number(e.target.value), minPosition: Number(e.target.value) })) })}
                            />in
                        </label>
                    </div>
                </div>
                <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="canvas"
                // onMouseMove={handleMouseMove}
                // onMouseUp={handleMouseUp}
                />
                <div className="controls">
                    {robot.arm.map((arm, i) => (
                        <div key={"arm" + i}>
                            <h3
                                style={{
                                    cursor: "pointer",
                                    color: arm.drawingEnabled ? "green" : "red",
                                }}
                                onClick={() => setRobot({ ...robot, arm: [...robot.arm.slice(0, i), { ...arm, drawingEnabled: !arm.drawingEnabled }, ...robot.arm.slice(i + 1)] })}
                            >
                                Arm {i + 1}
                            </h3>
                            <label>
                                Angle: <input
                                    type="number"
                                    min={arm.minAngle}
                                    max={arm.maxAngle}
                                    step={"0.1"}
                                    value={arm.angle}
                                    onChange={(e) => setRobot({ ...robot, arm: [...robot.arm.slice(0, i), { ...arm, angle: Number(e.target.value) }, ...robot.arm.slice(i + 1)] })}
                                />
                            </label>
                            <label>
                                Position: <input
                                    type="number"
                                    min={arm.minPosition}
                                    max={arm.maxPosition}
                                    step={"0.1"}
                                    value={arm.position}
                                    onChange={(e) => setRobot({ ...robot, arm: [...robot.arm.slice(0, i), { ...arm, position: Number(e.target.value) }, ...robot.arm.slice(i + 1)] })}
                                />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}
