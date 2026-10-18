# Spatial Orchestration UI — public showcase specification

This document specifies the standalone public preview. It is newly written for this repository; it is not a verbatim export of an internal specification.

## Purpose

Present fleet state, robot articulation, spatial occupancy and joint dynamics in one interactive viewport. All telemetry is synthetic and all controls affect this browser tab only. No robot control, inference, physics, or learned locomotion runs here.

## Interaction contract

| Surface | Behavior |
| --- | --- |
| Fleet roster | Select H1 Humanoid, Nova Carter or Unitree Go2; highlight selection and change inspector. Standby agents report no dynamics. |
| Viewport | Drag to orbit, scroll to zoom; switch perspective/elevated views. Procedural models are illustrative, not manufacturer CAD. |
| Spatial overlay | Toggle a static occupancy snapshot of the two elbow-v1 obstacle boxes. |
| Joint dynamics | Display synthetic effort for all 19 H1 joints; knees 20–45 Nm, arms 5–15 Nm. These are chosen display ranges, not measured performance. |
| Pause / resume | Freeze and continue simulation time without catch-up after backgrounding. |
| Stop demo | Pause locally. This is not a safety system or physical emergency stop. Resume restarts synthetic motion. |

## Telemetry contract

The 60-second loop contains 72 gait cycles at 1.2 Hz. Joint positions use radians, velocities radians per second and efforts Nm. The advertised forward speed is 0.75 m/s and drives floor ripple phase. The avatar walks in place; this is not a recorded 45-metre trajectory or an obstacle-navigation demonstration.

ROS coordinates are x forward, y left, z up. The view maps position `(x,y,z)` to `(y,z,x)`. Joint axes are converted from the ROS local frame into the procedural avatar's Y-up frame. Complete frames update all 19 joints atomically through `h1Rig.ts`; incomplete poses preserve the previous complete pose.

## Environment

Static public `elbow-v1` boxes, in ROS metres:

| ID | Centre | Size |
| --- | --- | --- |
| divider | 0.5, 1.3, 0.5 | 1.2, 0.5, 1.0 |
| outer | 3.0, 0.9, 0.5 | 0.4, 1.4, 1.0 |

Voxelized surfaces are synthetic at 0.1 m resolution. They do not represent sensor observations.

## Accessibility and runtime

Controls have accessible names, visible focus and selected states. Pause stops all scripted movement. At small widths the fleet and dynamics panels stack around the viewport. A missing WebGL context leaves a fallback message and telemetry. Rendering is capped at 1.5 device pixel ratio.

## Public boundary

The preview contains only React presentation, original procedural geometry, synthetic data, a joint-binding contract and a voxel decoder. There are no action clients, camera polling, robot endpoints, credentials, inference gateways, controller implementations, trained weights, logs or private history. `VITE_DEMO_MODE` gates startup; disabling it shows an inactive page and cannot enable a live transport.

Production uses a strict browser content policy, no source maps and no remote models, fonts or textures. Dependencies must be installed before building; the installed build and deployed app require no third-party runtime services.
