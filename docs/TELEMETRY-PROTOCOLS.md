# Public telemetry contracts

These describe the frontend decoder contracts inspected in the source workspace. They do not publish transport configuration, controller code or training artifacts.

## MBVX version 1

All multi-byte fields are little-endian. Header length is 24 bytes.

| Byte offset | Type | Meaning |
| --- | --- | --- |
| 0 | 4 ASCII bytes | `MBVX` magic |
| 4 | uint8 | Version: 1 |
| 5 | uint8 | 1 = full snapshot, 0 = additive delta |
| 6 | uint16 | Reserved; must be zero |
| 8 | uint32 | Stream epoch |
| 12 | uint32 | Sequence |
| 16 | uint32 | Cell count, at most 50,000 |
| 20 | float32 | Resolution in metres; decoder accepts 0.019 through 0.201 inclusive |
| 24 | count × (int16, int16, int16) | Signed integer voxel x, y, z indices |

Payload length must be exactly `24 + count * 6`. Each cell position is its integer coordinate multiplied by resolution; rendering maps ROS `(x,y,z)` to `(y,z,x)`.

A full snapshot replaces occupancy. A delta requires a synchronized stream with the same epoch, identical decoded resolution and exactly the next sequence number. A mismatch clears the stream; resume from a full snapshot. Same-epoch full snapshots with an old or duplicate sequence are ignored. Deltas add cells and have no deletion operation; removing cells requires a new full snapshot. Capacity is 50,000 unique cells after merging. Sequence rollover needs a full snapshot/new epoch. Timestamps and robot identity are not encoded in the payload; a consumer must track them separately.

## Foxglove / ROS 2 JointState

The private runtime advertises a ROS 2 `sensor_msgs/msg/JointState` schema through Foxglove. This repository contains no WebSocket client or bridge address. Foxglove transports and schema serialization are distinct from the articulation contract.

```text
std_msgs/Header header
string[] name
float64[] position
float64[] velocity
float64[] effort
```

The inspected boundary requires a nonempty list of unique joint names, equally sized finite positions and an integer timestamp (`sec`, `nanosec`, where `0 <= nanosec < 1e9`). It allows at most 1,024 names. Optional velocity and effort arrays are empty/absent or match the name vector with finite values. Units: radians, radians/second, Nm. A sample represents one timestamp, not a mixture of limb updates.

The H1 renderer requires all 19 canonical joints:

```text
left_hip_yaw_joint       right_hip_yaw_joint
left_hip_roll_joint      right_hip_roll_joint
left_hip_pitch_joint     right_hip_pitch_joint
left_knee_joint          right_knee_joint
left_ankle_joint         right_ankle_joint
torso_joint
left_shoulder_pitch_joint  right_shoulder_pitch_joint
left_shoulder_roll_joint   right_shoulder_roll_joint
left_shoulder_yaw_joint    right_shoulder_yaw_joint
left_elbow_joint           right_elbow_joint
```

Exact aliases without `_joint` are accepted; providing both spellings is ambiguous and rejected. Unknown names do not supply missing joints. Nonfinite or incomplete frames freeze the previous complete pose.

The demo directly synthesizes the named maps and does not serialize ROS messages. This documents compatibility, not an assertion that the public preview connects to ROS.
