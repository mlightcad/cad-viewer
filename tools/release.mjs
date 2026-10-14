#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(toolsDir, '..');
const packagesDir = path.join(rootDir, 'packages');

const PREVIEW_VERSION_RE = /^\d+\.\d+\.\d+-preview\.\d+$/;
const ANY_VERSION_RE = /^\d+\.\d+\.\d+(-preview\.\d+)?$/;

function run(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/**
 * Parse vX.Y.Z or vX.Y.Z-preview.N (also accepts without leading v).
 */
function parseVersion(tagOrVersion) {
  const raw = tagOrVersion.startsWith('v')
    ? tagOrVersion.slice(1)
    : tagOrVersion;
  const stable = raw.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (stable) {
    return {
      major: Number(stable[1]),
      minor: Number(stable[2]),
      patch: Number(stable[3]),
      preview: null,
      version: raw,
      isPreview: false,
    };
  }
  const preview = raw.match(/^(\d+)\.(\d+)\.(\d+)-preview\.(\d+)$/);
  if (preview) {
    return {
      major: Number(preview[1]),
      minor: Number(preview[2]),
      patch: Number(preview[3]),
      preview: Number(preview[4]),
      version: raw,
      isPreview: true,
    };
  }
  return null;
}

function compareVersions(a, b) {
  if (a.major !== b.major) return b.major - a.major;
  if (a.minor !== b.minor) return b.minor - a.minor;
  if (a.patch !== b.patch) return b.patch - a.patch;
  // Stable (preview null) sorts above previews of the same X.Y.Z for "latest stable"
  const ap = a.preview == null ? Number.POSITIVE_INFINITY : a.preview;
  const bp = b.preview == null ? Number.POSITIVE_INFINITY : b.preview;
  return bp - ap;
}

/**
 * Find latest stable vX.Y.Z tag (sorted by semver, not by time).
 */
function findLatestStableTag() {
  const output = run('git tag --list "v*.*.*"');
  if (!output) return null;

  const tags = output
    .split('\n')
    .map(t => ({ tag: t, v: parseVersion(t) }))
    .filter(t => t.v !== null && !t.v.isPreview);

  if (tags.length === 0) return null;

  tags.sort((a, b) => compareVersions(a.v, b.v));
  return tags[0].tag;
}

/**
 * Read lockstep version from every packages/<name>/package.json.
 */
function readLockstepPackageVersion() {
  const dirs = readdirSync(packagesDir, { withFileTypes: true }).filter(d =>
    d.isDirectory()
  );
  const versions = [];

  for (const dir of dirs) {
    const pkgPath = path.join(packagesDir, dir.name, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (!pkg.name || !pkg.version) continue;
      versions.push({ name: pkg.name, version: pkg.version, dir: dir.name });
    } catch {
      // skip packages without readable package.json
    }
  }

  if (versions.length === 0) {
    fail('No package versions found under packages/.');
  }

  const unique = [...new Set(versions.map(v => v.version))];
  if (unique.length !== 1) {
    const detail = versions.map(v => `  ${v.name}: ${v.version}`).join('\n');
    fail(`Package versions are not lockstep:\n${detail}`);
  }

  return unique[0];
}

function assertPackagesMatchVersion(version) {
  const packageVersion = readLockstepPackageVersion();
  if (packageVersion !== version) {
    fail(
      `Tag version ${version} does not match packages/* version ${packageVersion}. ` +
        `Bump with changesets first, then retry.`
    );
  }
}

function parseArgs(argv) {
  let previewFlag = false;
  let versionArg = null;

  for (const arg of argv) {
    if (arg === '--preview' || arg === '-p') {
      previewFlag = true;
      continue;
    }
    if (arg.startsWith('-')) {
      fail(`Unknown option "${arg}". Usage: pnpm release [version] [--preview]`);
    }
    if (versionArg) {
      fail(`Unexpected extra argument "${arg}".`);
    }
    versionArg = arg.startsWith('v') ? arg.slice(1) : arg;
  }

  return { previewFlag, versionArg };
}

/**
 * Main
 */
const { previewFlag, versionArg } = parseArgs(process.argv.slice(2));
let version = versionArg;

if (!version) {
  if (previewFlag) {
    version = readLockstepPackageVersion();
    if (!PREVIEW_VERSION_RE.test(version)) {
      fail(
        `packages/* version is "${version}". For --preview without an explicit ` +
          `version, packages must already be at X.Y.Z-preview.N ` +
          `(run changeset pre enter + changeset version first).`
      );
    }
    console.log(`ℹ️  Using lockstep package version for preview: v${version}`);
  } else {
    const latestTag = findLatestStableTag();
    if (!latestTag) {
      fail(
        'No existing stable vX.Y.Z tag found, please specify a version explicitly.'
      );
    }

    const v = parseVersion(latestTag);
    version = `${v.major}.${v.minor}.${v.patch + 1}`;

    console.log(
      `ℹ️  No version provided, auto-incrementing patch: ${latestTag} → v${version}`
    );
  }
}

if (!ANY_VERSION_RE.test(version)) {
  fail(
    `Invalid version "${version}". Expected X.Y.Z or X.Y.Z-preview.N`
  );
}

const parsed = parseVersion(version);
if (previewFlag && !parsed.isPreview) {
  fail(
    `Version "${version}" is stable, but --preview was set. ` +
      `Use X.Y.Z-preview.N for preview releases.`
  );
}

if (!previewFlag && parsed.isPreview) {
  console.log(
    `ℹ️  Version "${version}" is a preview release; npm will use dist-tag "preview".`
  );
}

assertPackagesMatchVersion(version);

const tag = `v${version}`;
const isPreview = parsed.isPreview;

/**
 * Safety checks
 */
try {
  run(`git rev-parse --verify refs/tags/${tag}`);
  fail(`Tag ${tag} already exists.`);
} catch {
  // tag does not exist → OK
}

try {
  const branch = run('git branch --show-current');
  if (branch !== 'main') {
    fail(`Current branch is "${branch}". Please release from "main".`);
  }
} catch {
  // non-fatal
}

console.log('Checking dependency versions against pnpm-workspace.yaml overrides...');
try {
  run('pnpm sync:versions:check');
} catch {
  fail(
    'Dependency versions are out of sync. Run "pnpm sync:versions", commit, then retry.'
  );
}

const status = run('git status --porcelain');
if (status) {
  fail('Working tree is not clean. Please commit or stash changes.');
}

/**
 * Create & push annotated tag
 */
const releaseKind = isPreview ? 'preview' : 'release';
console.log(`🚀 Creating ${releaseKind} tag ${tag}`);

run(`git tag -a ${tag} -m "release: release ${tag}"`);
run(`git push origin ${tag}`);

if (isPreview) {
  console.log(
    `✅ Preview tag ${tag} pushed successfully (CI publishes with npm dist-tag "preview")`
  );
  console.log(`   Install: pnpm add @mlightcad/cad-viewer@preview`);
} else {
  console.log(`✅ Release tag ${tag} pushed successfully`);
}
