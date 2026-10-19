// Tests for copy and paste of a rule (T20). The C# is ref/editor/Form1.cs 1054-1169.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule } from '../format/profile'
import { readProfile, writeRuleText } from '../format/profile'
import { copyRuleText, pasteRuleText } from './clipboard'

function fixture(): LootProfile {
  return readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
}

function rule(name: string): LootRule {
  return { name, customExpression: '', priority: 0, action: eLootAction.Keep, lootActionData: 0, requirements: [] }
}

describe('copyRuleText', () => {
  it('is base64(sha256(utf8(text))) + "#" + text', async () => {
    const p = fixture()
    const copied = p.rules[0]!
    const text = writeRuleText(copied)
    // The C# hashes the UTF-8 bytes and takes the base 64 of the digest
    // (Form1.cs 1093-1098), so the test hashes with node:crypto.
    const hash = createHash('sha256').update(text, 'utf8').digest('base64')
    expect(await copyRuleText(copied)).toBe(`${hash}#${text}`)
    // The text starts with the name line and uses CRLF (cLootItemRule.Write,
    // LootRules.cs 3003-3042).
    expect(text.startsWith(`${copied.name}\r\n`)).toBe(true)
  })

  it('keeps a "#" in the rule name', async () => {
    // Paste splits on the first "#" only, so the text keeps later "#" characters
    // (Form1.cs 1113-1115 rejoins the parts with "#").
    const copied = rule('A#B')
    const p: LootProfile = { version: 1, rules: [], extraBlocks: [] }
    const pasted = await pasteRuleText(p, await copyRuleText(copied), { checkHash: true })
    expect(pasted?.rules).toEqual([copied])
  })
})

describe('pasteRuleText', () => {
  it('copy then paste gives the same rule', async () => {
    const p = fixture()
    // A KeepUpTo rule, so the paste also reads the keep count line.
    const copied = p.rules.find((r) => r.action === eLootAction.KeepUpTo)
    expect(copied).toBeDefined()

    const pasted = await pasteRuleText(p, await copyRuleText(copied!), { checkHash: true })

    expect(pasted).not.toBeNull()
    expect(pasted!.rules).toHaveLength(p.rules.length + 1)
    expect(pasted!.rules[pasted!.rules.length - 1]).toEqual(copied)
    expect(p).toEqual(fixture())
  })

  it('pastes a rule with an unsupported requirement', async () => {
    // No fixture rule stays unsupported since T10, so the raw requirement is a
    // literal: its body is kept as text (cUnsupportedRequirement, LootRules.cs 221-272).
    const copied: LootRule = {
      ...rule('raw requirement'),
      requirements: [{ type: 12345, data: 'raw\r\ndata\r\n' }],
    }
    const p: LootProfile = { version: 1, rules: [], extraBlocks: [] }
    const pasted = await pasteRuleText(p, await copyRuleText(copied), { checkHash: true })

    expect(pasted?.rules).toEqual([copied])
  })

  it('changed text fails the hash check', async () => {
    const p = fixture()
    const copied = p.rules[0]!
    const text = await copyRuleText(copied)
    const cut = text.indexOf('#')
    const tampered = `${text.slice(0, cut)}#${text.slice(cut + 1).replace(copied.name, 'Renamed')}`

    expect(await pasteRuleText(p, tampered, { checkHash: true })).toBeNull()

    // "Paste unchecked" skips the hash check (Form1.cs 1162-1165).
    const pasted = await pasteRuleText(p, tampered, { checkHash: false })
    expect(pasted?.rules[pasted.rules.length - 1]?.name).toBe('Renamed')
  })

  it('rejects invalid clipboard text', async () => {
    const p = fixture()
    expect(await pasteRuleText(p, '', { checkHash: true })).toBeNull()
    // No "#" means fewer than two parts (Form1.cs 1112-1113).
    expect(await pasteRuleText(p, 'no hash here', { checkHash: true })).toBeNull()
    expect(await pasteRuleText(p, 'notthehash#text', { checkHash: true })).toBeNull()
    // Text that is not a rule fails in the read, which the C# paste swallows
    // with its empty catch (Form1.cs 1154).
    expect(await pasteRuleText(p, 'notthehash#text', { checkHash: false })).toBeNull()
  })

  it('Ctrl+paste replaces the selected rule in place', async () => {
    const p = fixture()
    const text = await copyRuleText(p.rules[0]!)

    const pasted = await pasteRuleText(p, text, { checkHash: true, replaceIndex: 5 })

    expect(pasted).not.toBeNull()
    expect(pasted!.rules).toHaveLength(p.rules.length)
    expect(pasted!.rules[5]).toEqual(p.rules[0])
    expect(pasted!.rules[4]).toEqual(p.rules[4])
    expect(p).toEqual(fixture())
  })

  it('returns the profile unchanged for an out-of-range replaceIndex', async () => {
    const p = fixture()
    const text = await copyRuleText(p.rules[0]!)
    expect(await pasteRuleText(p, text, { checkHash: true, replaceIndex: 999 })).toBe(p)
  })

  it('does nothing on a version 0 profile, where the C# read throws', async () => {
    // Copy always writes the expression line (LootRules.cs 3009), but a
    // version 0 read skips it (2950-2953). The expression line then becomes
    // the rule header, Convert.ToInt32("") throws and the paste does nothing.
    const copied = rule('v0 rule')
    const text = await copyRuleText(copied)
    const v0: LootProfile = { version: 0, rules: [copied], extraBlocks: [] }
    expect(await pasteRuleText(v0, text, { checkHash: true })).toBeNull()
  })
})
