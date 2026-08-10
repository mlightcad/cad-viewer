import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from 'vite'
import baseConfig from './vite.config'

/**
 * OPENPROF / A/B harness config: no file watching so mid-open HMR cannot
 * interrupt `__OPENPROF_DONE__`.
 *
 * TODO(direct-batch-prof): delete with ab-direct-line-batch.mjs before merge PR.
 */
export default defineConfig(async (env: ConfigEnv): Promise<UserConfig> => {
  const resolved =
    typeof baseConfig === 'function'
      ? await (baseConfig as (env: ConfigEnv) => UserConfig | Promise<UserConfig>)(
          env
        )
      : baseConfig
  return mergeConfig(resolved, {
    server: {
      hmr: false,
      watch: null
    }
  })
})
