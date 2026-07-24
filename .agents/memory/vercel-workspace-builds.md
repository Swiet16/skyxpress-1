---
name: Vercel workspace builds
description: Deployment workflow for this PNPM workspace when publishing through Vercel.
---

Vercel runs the repository root build from the commit on the connected GitHub branch, not from the current Replit working tree.

**Why:** A local build can pass while Vercel repeats an older failure if the fix has not been committed and pushed to the branch Vercel clones.

**How to apply:** Verify `git log` and the remote branch before diagnosing repeated Vercel logs; push the tested commit, then trigger a new deployment. Keep the root `pnpm run build` valid because Vercel runs it before the artifact output is served.