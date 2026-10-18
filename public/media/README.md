# Approved media capture plan

No private footage is bundled. Add reviewed captures only after removing hostnames, terminals, credentials, file paths and private dashboards from every frame and metadata.

| Capture | Target | What it should establish |
| --- | --- | --- |
| Hero | 5-second seamless loop, 1080p, 60 FPS MP4; optional small GIF | H1 walking with cyan floor ripples and HUD |
| Locomotion | 15–30 seconds, 1080p, 60 FPS | Isaac Sim locomotion; label simulation and actual playback speed |
| Navigation | 20–60 seconds, 1080p, 60 FPS | Obstacle course and resulting motion; retain unsuccessful behavior when relevant |
| Spatial reasoning | 15–30 seconds, 1080p, 60 FPS | VLM proposals and resulting decision; label prerecorded inference |

Use a clean capture layout with synthetic/public labels. Record actual frame rate; never describe a lower-frame-rate capture as 60 FPS. Remove audio unless needed. Strip container metadata, inspect the final export, and review rights to model assets shown. Do not publish simulator assets, training weights or raw private logs.

Once reviewed, explicitly extend the publication audit allowlist for the exact media files, then embed the hero and link the longer clips from the repository README. No fabricated performance recording is supplied.
