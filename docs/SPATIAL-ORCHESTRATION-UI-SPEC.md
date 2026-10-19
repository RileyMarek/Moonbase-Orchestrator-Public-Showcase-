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
| Local instructions | A small parser resolves saved locations, coordinates, relative moves, turns and waits. Unsupported text returns an error. No remote AI, physics or automatic rerouting runs. |
| Perception tool | Selected only while its drawer is open. Close, Escape and switching panels clear the selection. |
| Delete bot | Per-unit Fleet button removes geometry, pose/joint/voxel state and active entity generation. Cancels a mission owned by that bot and selects a remaining bot when needed. The last bot can be removed and later redeployed. |
| Spawn validation | Reject invalid/nonfinite coordinates, scene-boundary violations and footprints overlapping a bot or static obstacle. Show the blocking reason in the deployment form. |
| Collision checks | Preflight every route segment and check every swept movement segment, including the background patrol. Hold before a new collision, show the blocker, and recheck before resuming. No automatic route detours. |

Clearance uses conservative circular footprints: H1 radius 0.60 m, Go2 0.50 m and Carter 0.65 m, plus 0.10 m separation. Static obstacle boxes are inflated by the moving robot's radius and margin. The complete footprint must stay inside ROS XY bounds `[-2.5,-3.5,4.5,3.5]`. Checks use current animation poses, not delayed inspector readings. This is frontend kinematic validation, not a physics controller.

Waypoint drafts belong to individual robots. Switching units cancels picking and restores that unit's draft; dispatch consumes it, and reached targets disappear. Floor picking projects directly onto the ground plane in both camera modes and ignores decorative mesh occlusion and orbit drags.

Locations use one shared bookmark source. Drop a pin retains the form while picking, previews the chosen point, and saves its heading. Each location can be deleted; deletion invalidates prepared local plans.

Demo poses use ground anchors. H1 and Go2 retain their model standing offsets. Every rendered frame clamps invalid/submerged anchors and lifts the posed mesh above the floor; this visual fallback does not replace swept collision checks.

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
