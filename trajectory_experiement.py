import numpy as np
import matplotlib.pyplot as plt
import time

# Parameters
side_length = 20
x_a, y_a = 29/2, 29/2  # Base point coordinates
num_frames = 100
theta = np.linspace(0, 2*np.pi, num_frames)  # 100 steps of rotation

# Trajectory shape settings
trajectory_shape = "circle"  # Options: "circle", "triangle", "square"
trajectory_origin = (2.5, 2.5)
radius = 5.0


# Function to rotate a point or array of points
def rotate_point(xy_local, theta):
    rot_matrix = np.array([
        [np.cos(theta), -np.sin(theta)],
        [np.sin(theta), np.cos(theta)]
    ])
    return rot_matrix @ xy_local

# Define spinning square in local coordinates
half_side = side_length / 2
square_local = np.array([
    [-half_side, -half_side],
    [ half_side, -half_side],
    [ half_side,  half_side],
    [-half_side,  half_side],
    [-half_side, -half_side]
]).T

# Define trajectory shape in local coordinates
if trajectory_shape == "circle":
    t = np.linspace(0, 2*np.pi, num_frames)
    trajectory_shape_path = np.stack([radius * np.cos(t), radius * np.sin(t)], axis=0)
    local_path = trajectory_shape_path.T
elif trajectory_shape == "triangle":
    trajectory_shape_path = np.array([
        [0, side_length / 2],
        [-side_length / 2, -side_length / 2],
        [side_length / 2, -side_length / 2],
        [0, side_length / 2]  # Close loop
    ]).T
    # Repeat to fill num_frames
    local_path = trajectory_shape_path.T
    repeats = int(np.ceil(num_frames / len(local_path)))
    local_path = np.tile(local_path, (repeats, 1))[:num_frames]
elif trajectory_shape == "square":
    trajectory_shape_path = np.array([
        [-half_side, -half_side],
        [ half_side, -half_side],
        [ half_side,  half_side],
        [-half_side,  half_side],
        [-half_side, -half_side]
    ]).T
    local_path = trajectory_shape_path.T
    repeats = int(np.ceil(num_frames / len(local_path)))
    local_path = np.tile(local_path, (repeats, 1))[:num_frames]
else:
    raise ValueError("Unsupported trajectory shape")

# Apply trajectory origin offset
local_path[:,0] += trajectory_origin[0]
local_path[:,1] += trajectory_origin[1]
trajectory_shape_path[0] += trajectory_origin[0]
trajectory_shape_path[1] += trajectory_origin[1]

# Convert local path to global at each rotation step
global_path = []
for i in range(num_frames):
    global_point = rotate_point(local_path[i], theta[i])
    global_path.append(global_point)
global_path = np.array(global_path)

# Setup interactive plot
plt.ion()
fig, ax = plt.subplots(figsize=(6,6))
ax.set_aspect('equal')
ax.set_xlim(-30,20)
ax.set_ylim(-30,20)
ax.set_title("Animated End Effector Trajectory with Spinning Square")
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.grid(True)

# Initialize elements
line, = ax.plot([], [], 'r-', label="Arm {0}".format(np.sqrt((x_a - global_path[0, 0])**2 + (y_a - global_path[0, 1])**2)))
point, = ax.plot([], [], 'bo', label="End effector")
base, = ax.plot(x_a, y_a, 'go', label="Base point")
traj, = ax.plot([], [], 'b--', alpha=0.5, label="Path so far")
square_line, = ax.plot([], [], 'k-', alpha=0.3, label="Spinning square")
shape_line, = ax.plot([], [], 'm-', alpha=0.4, label="Desired shape")

x_data, y_data = [], []
for frame in range(num_frames):
    x, y = global_path[frame]
    line.set_data([x_a, x], [y_a, y])
    point.set_data([x], [y])
    x_data.append(x)
    y_data.append(y)
    traj.set_data(x_data, y_data)

    # Rotate spinning square
    square_rotated = rotate_point(square_local, theta[frame])
    square_line.set_data(square_rotated[0], square_rotated[1])

    # Rotate and draw the desired trajectory shape within the square
    shape_rotated = rotate_point(trajectory_shape_path, theta[frame])
    shape_line.set_data(shape_rotated[0], shape_rotated[1])

    plt.pause(0.05)

plt.ioff()
ax.legend()
plt.show()

print("Arm Length: ", np.sqrt((x_a - global_path[-1, 0])**2 + (y_a - global_path[-1, 1])**2))
print("Final End Effector Position: ", global_path[-1])
print("Trajectory Origin: ", trajectory_origin)
print("Trajectory Shape: ", trajectory_shape)