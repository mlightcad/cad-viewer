#!/usr/bin/env node
import { execSync } from 'node:child_process';

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
 * Parse vX.Y.Z
 */
function parseVersion(tag) {
  const m = tag.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/**
 * Find latest vX.Y.Z tag (sorted by semver, not by time)
 */
function findLatestTag() {
  const output = run('git tag --list "v*.*.*"');
  if (!output) return null;

  const tags = output
    .split('\n')
    .map(t => ({ tag: t, v: parseVersion(t) }))
    .filter(t => t.v !== null);

  if (tags.length === 0) return null;

  tags.sort((a, b) => {
    if (a.v.major !== b.v.major) return b.v.major - a.v.major;
    if (a.v.minor !== b.v.minor) return b.v.minor - a.v.minor;
    return b.v.patch - a.v.patch;
  });

  return tags[0].tag;
}

/**
 * Main
 */
let version = process.argv[2];

if (!version) {
  const latestTag = findLatestTag();
  if (!latestTag) {
    fail('No existing vX.Y.Z tag found, please specify a version explicitly.');
  }

  const v = parseVersion(latestTag);
  version = `${v.major}.${v.minor}.${v.patch + 1}`;

  console.log(`ℹ️  No version provided, auto-incrementing patch: ${latestTag} → v${version}`);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`Invalid version "${version}". Expected format: X.Y.Z`);
}

const tag = `v${version}`;

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

const status = run('git status --porcelain');
if (status) {
  fail('Working tree is not clean. Please commit or stash changes.');
}

/**
 * Create & push annotated tag
 */
console.log(`🚀 Creating tag ${tag}`);

run(`git tag -a ${tag} -m "release: release ${tag}"`);
run(`git push origin ${tag}`);

console.log(`✅ Release tag ${tag} pushed successfully`);
