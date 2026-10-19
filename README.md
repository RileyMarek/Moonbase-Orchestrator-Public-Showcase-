# Project Moonbase

### Spatial intelligence for embodied fleets.

One command surface for humanoids, quadrupeds and mobile robots: a spatial twin, articulated state and fleet telemetry in the browser.

**Interactive demo:** deployment pending. Run locally below, or deploy this repository with the included GitHub Pages workflow / Vercel configuration.

**Embodied Digital Twins:** Includes the complete 19-DOF Unitree H1 humanoid mesh (`h1.glb`), Nova Carter AMR, and Unitree Go2 quadruped models matching the production Moonbase operations platform.

![Moonbase system architecture](docs/architecture.svg)

The diagram presents the broader system concept. The public implementation here is the client showcase only. Model/vendor choices shown in the architecture are not benchmark or readiness claims.

```mermaid
flowchart LR
    Twin[Digital Twin] <--> State[Real-time State Matrix]
    State <--> Reasoning[VLM Spatial Reasoning]
    State <--> Fleet[ROS 2 / Heterogeneous Fleet]
```

## Try the spatial console

```sh
npm ci
npm run dev -- --mode production
```

Open the address Vite prints. Select agents, orbit the twin, inspect synthetic joint loads, toggle occupancy, and pause or resume the gait. No ROS installation, GPU workstation or API account is required.

```sh
npm test
npm run build
npm run preview
```

Use Node.js 24. The production flag is `VITE_DEMO_MODE=true` in `.env.production`. Disabling it makes the preview inactive. There is no live transport to enable. npm dependency installation requires registry access; after installation the build and application use local resources only.

## What this demonstrates

- Exact production Spatial HUD UI: full-bleed 3D viewport, tool palette (`3D | 2D` camera, perception, waypoints, voxels, fleet), equalizer telemetry bars, and mission control.
- Heterogeneous embodiment switching between Unitree H1 Humanoid, Nova Carter AMR, and Unitree Go2 Quadruped.
- A 19-joint articulation contract with real-time skeletal kinematics streaming.
- Dynamic ground ripples, floor dot matrix, and static `elbow-v1` obstacle voxel scene.
- A client-side in-browser showcase with zero network requirements or backend services.

**Broader project stack:** ROS 2, Fast DDS, NVIDIA Isaac Sim, PPO locomotion and VLM spatial reasoning. Those systems are not included or executed in this repository. Synthetic demo motion must not be used as evidence of physical robot performance or obstacle avoidance.

## Specifications

- [Spatial orchestration UI specification](docs/SPATIAL-ORCHESTRATION-UI-SPEC.md)
- [MBVX v1 and Foxglove joint schema](docs/TELEMETRY-PROTOCOLS.md)
- [Publication boundary and release checklist](docs/PUBLICATION.md)
- [Capture plan for approved 60 FPS media](public/media/README.md)

## Deploy

For GitHub Pages, choose **GitHub Actions** as the Pages source in repository settings, then run **Deploy showcase** manually. The workflow tests, builds, audits and publishes `dist/`. Relative asset paths support this repository's Pages subdirectory. The deployment job reports the final live URL; replace the pending demo notice only after it succeeds. See the [Vite deployment guide](https://vite.dev/guide/static-deploy.html) and [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

For Vercel, import this repository as a Vite project. The included config uses `npm run build` and output directory `dist`. No private environment variables are needed.

## Contact

Project Moonbase is in active development. For commercial inquiries, partnerships, or investment:
- **Email:** [rileyc.marek@gmail.com](mailto:rileyc.marek@gmail.com)
- **GitHub:** [@RileyMarek](https://github.com/RileyMarek)

Public visibility does not itself grant a software license. A project license has not yet been selected; dependencies retain their respective licenses.
