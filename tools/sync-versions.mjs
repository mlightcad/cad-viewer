#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(toolsDir, '..');
const packagesDir = path.join(rootDir, 'packages');
const rootPackageJsonPath = path.join(rootDir, 'package.json');
const pnpmWorkspaceYamlPath = path.join(rootDir, 'pnpm-workspace.yaml');

function isWorkspaceVersion(value) {
  return typeof value === 'string' && value.startsWith('workspace:');
}

function parseOverridesFromWorkspaceYaml(content) {
  const overrides = {};
  const lines = content.split(/\r?\n/);
  let inOverrides = false;

  for (const line of lines) {
    if (!inOverrides) {
      if (/^overrides:\s*$/.test(line)) {
        inOverrides = true;
      }
      continue;
    }

    if (/^[^\s#]/.test(line)) {
      break;
    }

    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const entryMatch = trimmed.match(
      /^(?:'([^']+)'|"([^"]+)"|([^:\s]+))\s*:\s*(.+)$/
    );
    if (!entryMatch) continue;

    const key = entryMatch[1] ?? entryMatch[2] ?? entryMatch[3];
    let value = entryMatch[4].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    overrides[key] = value;
  }

  return overrides;
}

async function readPnpmOverrides() {
  try {
    const content = await readFile(pnpmWorkspaceYamlPath, { encoding: 'utf8' });
    const fromYaml = parseOverridesFromWorkspaceYaml(content);
    if (Object.keys(fromYaml).length > 0) {
      return fromYaml;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const rootPkg = await readJson(rootPackageJsonPath);
  return rootPkg.pnpm?.overrides ?? {};
}

function buildRootVersionMap(rootPkg, overrides) {
  return {
    ...(rootPkg.dependencies ?? {}),
    ...(rootPkg.devDependencies ?? {}),
    ...(rootPkg.peerDependencies ?? {}),
    ...overrides,
  };
}

async function readJson(filePath) {
  const content = await readFile(filePath, { encoding: 'utf8' });
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(filePath, content, { encoding: 'utf8' });
}

async function findWorkspacePackageNames(rootPkg) {
  const packageNames = new Set();
  const entries = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(packagesDir, entry.name, 'package.json');
    try {
      const pkg = await readJson(pkgPath);
      if (pkg.name) {
        packageNames.add(pkg.name);
      }
    } catch {
      // ignore packages without package.json
    }
  }

  for (const item of rootPkg.workspaces ?? []) {
    if (item.endsWith('/*')) continue;
    if (item.endsWith('.json')) continue;
  }

  return packageNames;
}

async function syncPackage(
  packageFilePath,
  rootVersionMap,
  workspacePackageNames,
  overrides = {},
  { write = true } = {}
) {
  const pkg = await readJson(packageFilePath);
  const dependencyKeys = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];
  let changed = false;
  const drifts = [];

  for (const depKey of dependencyKeys) {
    const deps = pkg[depKey];
    if (!deps || typeof deps !== 'object') continue;

    for (const [name, value] of Object.entries(deps)) {
      let newVersion = null;

      // Priority 1: handle workspace:* versions
      if (isWorkspaceVersion(value)) {
        if (workspacePackageNames.has(name)) continue;

        const rootVersion = rootVersionMap[name];
        if (!rootVersion) {
          console.warn(`⚠️  ${pkg.name || packageFilePath}: no root version found for ${name} in ${depKey}`);
          continue;
        }
        newVersion = rootVersion;
      }
      // Priority 2: check versions in pnpm-workspace.yaml overrides
      else if (overrides[name] && value !== overrides[name]) {
        newVersion = overrides[name];
      }

      if (newVersion && deps[name] !== newVersion) {
        drifts.push({ depKey, name, from: deps[name], to: newVersion });
        deps[name] = newVersion;
        changed = true;
      }
    }
  }

  if (changed && write) {
    await writeJson(packageFilePath, pkg);
  }

  return { changed, drifts, pkgName: pkg.name };
}

(async () => {
  const checkOnly = process.argv.includes('--check');

  try {
    const rootPkg = await readJson(rootPackageJsonPath);
    const overrides = await readPnpmOverrides();
    const rootVersionMap = buildRootVersionMap(rootPkg, overrides);
    const workspacePackageNames = await findWorkspacePackageNames(rootPkg);

    const packageDirs = await readdir(packagesDir, { withFileTypes: true });
    const changedFiles = [];

    for (const entry of packageDirs) {
      if (!entry.isDirectory()) continue;
      const packageFilePath = path.join(packagesDir, entry.name, 'package.json');
      try {
        const { changed, drifts, pkgName } = await syncPackage(
          packageFilePath,
          rootVersionMap,
          workspacePackageNames,
          overrides,
          { write: !checkOnly }
        );
        if (changed) {
          changedFiles.push({ packageFilePath, drifts, pkgName });
        }
      } catch (error) {
        console.error(`❌ Failed to process ${packageFilePath}:`, error.message);
      }
    }

    if (changedFiles.length === 0) {
      console.log('✅ Package dependency versions are in sync with pnpm-workspace.yaml overrides.');
      return;
    }

    if (checkOnly) {
      console.error('❌ package.json dependency versions are out of sync with pnpm-workspace.yaml overrides:');
      for (const { packageFilePath, drifts, pkgName } of changedFiles) {
        console.error(`  ${pkgName || path.relative(rootDir, packageFilePath)}:`);
        for (const { depKey, name, from, to } of drifts) {
          console.error(`    ${depKey}.${name}: ${from} → ${to}`);
        }
      }
      console.error('\nRun "pnpm sync:versions", commit the changes, then retry the release.');
      process.exit(1);
    }

    console.log('✅ Synced versions in the following package.json files:');
    for (const { packageFilePath } of changedFiles) {
      console.log(`  - ${path.relative(rootDir, packageFilePath)}`);
    }
  } catch (error) {
    console.error('❌ sync-workspace-versions failed:', error.message);
    process.exit(1);
  }
})();
