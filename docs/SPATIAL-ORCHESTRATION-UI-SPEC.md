# Spatial Orchestration UI — public showcase specification

This document specifies the standalone public preview. It is newly written for this repository; it is not a verbatim export of an internal specification.

## Purpose

Present fleet state, robot articulation, spatial occupancy and joint dynamics in one interactive viewport. All telemetry is synthetic and all controls affect this browser tab only. No robot control, inference, physics, or learned locomotion runs here.

## Interaction contract

| Surface | Behavior |
| --- | --- |
| Fleet roster | Select H1 Humanoid, Nova Carter or Unitree Go2; highlight selection and change inspector. Standby agents report no dynamics. |
| Viewport | Uses the production Spatial HUD and H1 GLB, Carter and Go2 components. Drag to orbit, scroll to zoom; switch 3D/2D views. |
| Spatial overlay | Toggle synthetic occupancy of the floor and two elbow-v1 obstacle boxes. Decorative sensor fields surround every fleet unit independently of the Perception drawer. |
| Joint dynamics | Display synthetic effort for all 19 H1 joints; knees 20–45 Nm, arms 5–15 Nm. These are chosen display ranges, not measured performance. |
| Pause / resume | Freeze and continue simulation time without catch-up after backgrounding. |
| Stop demo | Pause locally. This is not a safety system or physical emergency stop. Resume restarts synthetic motion. |
| Movement | All embodiments accept waypoint sequences. The browser kinematic simulator turns, translates, waits and holds the final pose. A mission stays bound to the unit selected at dispatch. |
| Local instructions | A small parser resolves saved locations, coordinates, relative moves, turns and waits. Unsupported text returns an error. No remote AI, physics or obstacle avoidance runs. |
| Perception tool | Selected only while its drawer is open. Close, Escape and switching panels clear the selection. |

## Telemetry contract

The 60-second H1 gait loop contains 72 cycles at 1.2 Hz. Joint positions use radians, velocities radians per second and efforts Nm. H1 translation is limited to 0.75 m/s, Go2 to 0.7 m/s and Carter to 0.6 m/s. Displayed base speed comes from the kinematic displacement. Gait animates during translation and holds on pause. This is synthetic motion, not a recorded physics or obstacle-navigation demonstration.

ROS coordinates are x forward, y left, z up. The view maps position `(x,y,z)` to `(y,z,x)`. The production H1 GLB retains its rig axis metadata and rest transforms. Complete frames update all 19 joints atomically through `h1Rig.ts`; incomplete poses preserve the previous complete pose.

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

The preview contains React presentation, the licensed H1 GLB, production Carter/Go2 presentation geometry, synthetic data, local kinematic demo logic, a joint-binding contract and a voxel decoder. There are no live action clients, camera polling, robot endpoints, credentials, inference gateways, physical controllers, trained weights, private logs or private history. `VITE_DEMO_MODE` gates startup; disabling it shows an inactive page and cannot enable a live transport.

Production uses a strict browser content policy, no source maps and no remote models, fonts or textures. Dependencies must be installed before building; the installed build and deployed app require no third-party runtime services.
