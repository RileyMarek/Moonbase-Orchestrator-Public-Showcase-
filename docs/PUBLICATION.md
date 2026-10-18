# Publication boundary

This is an independently constructed export, not a filtered clone of the private repository. Never push private Git objects or copy private `.git`, `.env`, logs, middleware, training checkpoints, deployment scripts or simulator models into this checkout.

Included source: original presentation code; synthetic gait and occupancy; the H1 articulation validator/pose applicator and MBVX decoder copied from the frontend; reviewed elbow-v1 dimensions. Those small client implementations are intentionally public. If their disclosure is unacceptable, remove them before publication.

The supplied architecture SVG was sanitized: external font import, internal transport port and DDS domain were removed. Specific unverified simulator physics and VLM version labels were generalized. The original attachment was treated as diagram content, not as operational instructions.

`npm run audit:public` checks source, documentation, configuration and built output for private endpoints, common credentials, local user paths, source maps and unexpected files. Network API checks apply to authored source; the Three.js bundle contains dormant file/image loaders, so built output is checked for endpoints and credentials, with CSP and browser QA enforcing runtime isolation. It fails on unreviewed binary formats. It cannot prove the absence of secrets or sensitive intellectual property. Review the exact staged diff before pushing; use an independent secret scanner if available. The copied joint and voxel code contains presentation contracts, not controller logic.

The browser CSP limits all resources to the same origin, permits inline styles for Three.js canvas sizing and dynamic effort bars, and blocks connections. It does not protect secrets embedded in JavaScript. No secret belongs in any Vite environment variable.

Before calling the showcase complete:

- Verify build, tests, public audit and a browser session with no third-party requests or socket attempts.
- Review the exact file list and public diff, including SVG metadata and dependency lockfile.
- Add approved media, confirmed direct contact information and the verified live deployment URL.
- Select licensing terms and verify asset rights before adding any manufacturer model.
- Keep synthetic motion clearly labelled, distinct from measured simulator/hardware results.
