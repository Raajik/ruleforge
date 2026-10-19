/**
 * Copy and paste of a rule, as the legacy editor does it (Form1.cs 1054-1169).
 *
 * The clipboard text is `base64(sha256(utf8(ruleText))) + "#" + ruleText`
 * (Form1.cs 1093-1098). `pasteRuleText` gives null when the text is invalid.
 * The legacy editor then shows "Invalid rule format in clipboard." (1111-1124).
 * A read error shows nothing at all, because of the empty catch (1154).
 */

import type { LootProfile, LootRule } from '../format/profile'
import { readRuleText, writeRuleText } from '../format/profile'

/** sha256 of the text as base 64, the hash the clipboard text starts with. */
async function hashBase64(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

/**
 * The clipboard text of one rule (Form1.cs 1078-1099). The C# writes the rule
 * with `cLootItemRule.Write`, hashes the UTF-8 bytes of that text and joins
 * the two with "#".
 */
export async function copyRuleText(rule: LootRule): Promise<string> {
  const text = writeRuleText(rule)
  return `${await hashBase64(text)}#${text}`
}

export interface PasteOptions {
  /** false is the "paste unchecked" menu item (Form1.cs 1162-1165). */
  checkHash: boolean
  /**
   * Ctrl+paste replaces the rule at this index. The C# inserts the pasted
   * rule after the selected one, then deletes the old one (Form1.cs 1143-1147).
   * Without it the pasted rule goes to the end of the list (1015).
   */
  replaceIndex?: number
}

/**
 * Pastes clipboard text into the profile. Null means invalid text. Never
 * changes the input profile. An out-of-range `replaceIndex` returns the input
 * profile unchanged, as the other rule edits do.
 */
export async function pasteRuleText(
  profile: LootProfile,
  clipboardText: string,
  { checkHash, replaceIndex }: PasteOptions,
): Promise<LootProfile | null> {
  try {
    if (!clipboardText) return null
    // Split on the first "#": part 0 is the hash, the rest is the rule text
    // (Form1.cs 1112-1115 rejoins the split parts with "#").
    const cut = clipboardText.indexOf('#')
    if (cut < 0) return null
    const text = clipboardText.slice(cut + 1)
    if (checkHash && (await hashBase64(text)) !== clipboardText.slice(0, cut)) return null
    if (!text) return null

    const rule = readRuleText(text, profile.version)
    const rules = [...profile.rules]
    if (replaceIndex === undefined) {
      rules.push(rule)
    } else if (replaceIndex >= 0 && replaceIndex < rules.length) {
      rules[replaceIndex] = rule
    } else {
      return profile
    }
    return { ...profile, rules }
  } catch {
    // The C# paste swallows every read error (Form1.cs 1154).
    return null
  }
}
