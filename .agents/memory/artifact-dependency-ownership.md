---
name: Artifact dependency ownership
description: Dependency placement rule for imported PNPM workspace artifacts.
---

Each runnable artifact must declare the packages imported by its source in its own package manifest, even when PNPM hoisting makes local development appear to work from the workspace root.

**Why:** Static publishing builds an artifact through its package-specific command and can fail when imports are only satisfied accidentally by root-level dependencies.

**How to apply:** When repairing an imported artifact, compare its source imports with `artifacts/<slug>/package.json`, keep the lockfile synchronized, and verify the package-specific typecheck and production build.