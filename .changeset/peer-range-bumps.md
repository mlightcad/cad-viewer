---
'@mlightcad/cad-editor': patch
---

fix: declare peer dependencies as compatible ranges instead of exact versions

Peer dependencies were pinned with `workspace:*`, which Changesets treats as the
exact current version. Any package taking a minor bump therefore fell outside
those peers and was escalated to a major, and the fixed group then dragged every
other package up with it — a routine `pnpm changeset version` could only ever
produce a patch or the next major.

Peers now use `workspace:^`, so a minor release of a peer stays inside the
declared range and dependents keep the minor bump. Combined with
`onlyUpdatePeerDependentsWhenOutOfRange`, a major is still forced when a peer
actually leaves the range.
