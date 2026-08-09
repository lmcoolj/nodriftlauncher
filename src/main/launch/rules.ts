import type { Rule } from './types'

/** Mojang's OS name for the current platform. */
export function currentOsName(): string {
  switch (process.platform) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'osx'
    default:
      return 'linux'
  }
}

/** Legacy natives-map OS key. */
export function currentOsKey(): string {
  return currentOsName()
}

function currentArch(): string {
  return process.arch === 'ia32' ? 'x86' : process.arch // 'x64' | 'arm64' | 'x86'
}

/**
 * Evaluate a Mojang rules array. With no rules, the item is allowed. Otherwise
 * we walk the rules in order; each matching rule sets the verdict to its action,
 * so a later matching rule can override an earlier one (this mirrors the
 * official launcher's behaviour). Unknown features default to false.
 */
export function rulesAllow(
  rules?: Rule[],
  features: Record<string, boolean> = {}
): boolean {
  if (!rules || rules.length === 0) return true

  let allowed = false
  for (const rule of rules) {
    let matches = true

    if (rule.os) {
      if (rule.os.name && rule.os.name !== currentOsName()) matches = false
      if (rule.os.arch && rule.os.arch !== currentArch()) matches = false
      // rule.os.version (a regex on OS version) is intentionally ignored.
    }

    if (rule.features) {
      for (const [key, expected] of Object.entries(rule.features)) {
        if ((features[key] ?? false) !== expected) matches = false
      }
    }

    if (matches) allowed = rule.action === 'allow'
  }

  return allowed
}
