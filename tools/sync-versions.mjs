#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(toolsDir, '..');
const packagesDir = path.join(rootDir, 'packages');
const rootPackageJsonPath = path.join(rootDir, 'package.json');

function isWorkspaceVersion(value) {
  return typeof value === 'string' && value.startsWith('workspace:');
}

function buildRootVersionMap(rootPkg) {
  return {
    ...(rootPkg.dependencies ?? {}),
    ...(rootPkg.devDependencies ?? {}),
    ...(rootPkg.peerDependencies ?? {}),
    ...(rootPkg.pnpm?.overrides ?? {}),
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

async function syncPackage(packageFilePath, rootVersionMap, workspacePackageNames, overrides = {}) {
  const pkg = await readJson(packageFilePath);
  const dependencyKeys = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];
  let changed = false;

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
      // Priority 2: check versions in pnpm.overrides
      else if (overrides[name] && value !== overrides[name]) {
        newVersion = overrides[name];
      }

      if (newVersion && deps[name] !== newVersion) {
        deps[name] = newVersion;
        changed = true;
      }
    }
  }

  if (changed) {
    await writeJson(packageFilePath, pkg);
  }

  return changed;
}

(async () => {
  try {
    const rootPkg = await readJson(rootPackageJsonPath);
    const rootVersionMap = buildRootVersionMap(rootPkg);
    const overrides = rootPkg.pnpm?.overrides ?? {};
    const workspacePackageNames = await findWorkspacePackageNames(rootPkg);

    const packageDirs = await readdir(packagesDir, { withFileTypes: true });
    const changedFiles = [];

    for (const entry of packageDirs) {
      if (!entry.isDirectory()) continue;
      const packageFilePath = path.join(packagesDir, entry.name, 'package.json');
      try {
        const changed = await syncPackage(packageFilePath, rootVersionMap, workspacePackageNames, overrides);
        if (changed) changedFiles.push(packageFilePath);
      } catch (error) {
        console.error(`❌ Failed to process ${packageFilePath}:`, error.message);
      }
    }

    if (changedFiles.length === 0) {
      console.log('✅ No workspace:* versions needed syncing.');
    } else {
      console.log('✅ Synced versions in the following package.json files:');
      for (const file of changedFiles) {
        console.log(`  - ${path.relative(rootDir, file)}`);
      }
    }
  } catch (error) {
    console.error('❌ sync-workspace-versions failed:', error.message);
    process.exit(1);
  }
})();
