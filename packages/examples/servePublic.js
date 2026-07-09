#!/usr/bin/env node
process.env.NO_UPDATE_CHECK = '1'

import { spawnSync } from 'node:child_process'

const { status, error } = spawnSync('serve', ['./public/'], {
  stdio: 'inherit',
  shell: true
})

if (error) {
  console.error(error)
  process.exit(1)
}

process.exit(status ?? 1)
