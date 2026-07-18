// TODO(cs): Czech translations for the interactive command jig prompts are not done yet.
// AcApI18n.t() has no per-key locale fallback (a missing cs key returns the raw key, not en),
// so we re-export the English tree as a placeholder — under `cs` these prompts show English
// until translated, rather than leaking dotted keys like "jig.arc.startPoint" into the
// command line. Replace this re-export with a real Czech `jig` tree to finish the locale.
export { default } from '../en/jig'
