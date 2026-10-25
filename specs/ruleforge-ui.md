# Ruleforge interface (FilterBlade-style)

The user's request (2026-10-19): an interface like FilterBlade (filterblade.xyz), the loot filter editor for
Path of Exile. Use the dark "Forge" look of mockup A. The user approved mockups A, A2 and A3 on the design
canvas "Ruleforge interface mockups". Do not publish a release before this interface exists (user, 2026-10-19).

## What the user sees

Five pages in a top bar: Overview, Customize, Loot preview, Salvage, Review changes. Export is a button on every
page.

- **Overview (A2):** pick a base profile, a strictness level and your character. A short sample of drops shows
  the result.
- **Customize (A3):** categories on the left, the rules of one category in the middle, a loot preview on the
  right. Each rule row has an on/off box, a one-line summary and at most one main number to edit.
  "Edit rules in detail" opens the full editor.
- **Rule editor (A):** the three-panel editor: the rule list, the rule with its requirements, and the
  requirement fields. It has all the features of phases E and F.
- **Loot preview:** sample items, each with the action that the profile gives it. A click on an item shows the
  rule that matched and the result of each requirement.
- **Salvage:** the T30 salvage combine tab, in the new look.
- **Review changes:** each change against the base profile, with one Undo for each change.

## Constraints

- The file format code in `src/core/format` does not change. The `.utl` round-trip gate stays green.
- Categories come from the profile itself: a rule whose name starts and ends with two or more `*` starts a
  category. A name with leading spaces, or with exactly two `*`, is a sub-category. Rules before the first one go
  in "Uncategorized". A file never gets new marker rules unless the user adds a
  category.
- The loot preview ports the match logic of the C#: each requirement's `Match` (`ref/shared/LootRules.cs`, 32
  methods, `#if VTC_PLUGIN`), `cLootItemRule.Match` (2902-2907), and the first-match rule order in
  `ref/plugin/LootCore.cs`. The port is a pure function `(profile, item) => decision` with tests.
- Rule patterns are .NET regexes. The port translates the .NET syntax that JS reads differently: leading inline
  flags `(?i)`, `(?m)`, `(?s)`, and the anchors `\A`, `\Z`, `\z`. Atomic groups, `\p{..}`, class subtraction and a
  class that starts with `]` give "error" on the rule rather than a wrong answer.
- Sample items are a JSON file of item property values, keyed by the same enum names as
  `src/core/gamedata/generated.ts`.
- Strictness and character settings change only these things: which categories are on, and the main number of
  some rules. Each level is data in a file, not code.
- Keyboard and screen reader support, as in the mockups: real buttons, labels and focus order.
- The web build stays a static site, so GitHub Pages can host it.

## Phases

1. **H1 Look:** the Forge theme and the rule editor (A) over the current features. No new behavior.
2. **H2 Categories and Customize:** categories from `***` rules, the Customize page, rule summaries.
3. **H3 Evaluator and loot preview:** the match port, the sample item file, the preview and "why".
4. **H4 Review changes:** a diff against the base profile.
5. **H5 Overview:** base profiles, strictness and character. It needs the content below.

### H2 design decisions

- The Customize page is a new tab beside "Loot Rules". "Edit rules in detail" opens the Loot Rules tab. The
  page shows the category list
  on the left, the rules of one category in the middle, and one number box per rule. It has no loot
  preview panel. That panel is H3.
- The number box of a rule edits the first value field of the rule, the one `requirementFields`
  gives first. It is absent when the rule has no requirement with a value field.
- A rule summary is one line, built from the requirements in order: the `ruleTypeName` of each type,
  the acts-on key name and the value. The parts join with `, `. It is a plain reading of the file,
  not the prose of the mockup. H3 replaces it with the evaluator text where the mockup shows it.

### H4 design decisions

- The base profile is the file that the user opened. File > Open and File > New set a new base profile. A save
  does not change it, so the user can review every change of the session.
- The diff covers the rules. The extra blocks, such as the salvage combine ranges, are not in the diff.
- The name of a rule is its key. A rule with the same name in both profiles is the same rule, even when it
  moved. A rule whose name changed is one changed rule. Its other fields and its requirements must be the
  same, so the change is the name alone. This needs one free rule on each side, so the diff never guesses
  which rule is which.
- The list follows the order of the current profile. The removed rules come last, in the order of the base
  profile.
- Each change has one Undo. The undo of an added rule removes the rule. The undo of a removed rule puts the
  base rule back at its place. The undo of a changed rule gives the base rule back.
- The page shows the changed fields (name, action, keep count, priority, custom expression) and the changed
  requirements. The tab shows the number of changes, as the mockup does.
- The page is a tab beside "Salvage Combination".

## The base profile: LootSnob v4

The user (2026-10-19): LootSnob v4 is the profile that almost everyone uses. Its Keep rules define the best
items in each bracket. The tailoring (appearance) rules and the salvage rules are not part of that.

What the file holds (Observed, `fixtures/LootSnobV4.utl`, 1,627 rules):
- Two levels of sections: `*****` top sections (Trophies, Melee Weapons, Missile Weapons, Wands, Item Only,
  Armor, Cloaks, Shields, Death Items, Value, Tailoring, Salvage and more) hold `**` sub-sections (for example
  Legendary Sets, Epic, Major). The names of the rules in them start with spaces.
- Most rules are off: a `DisabledRule` requirement. For example, 312 of the 342 melee weapon rules are off. A
  player turns on what fits the character.

So the Customize page groups rules by both section levels, and a rule's on/off box is its `DisabledRule`.
Strictness and character choices turn whole sections or rules on and off. They do not change thresholds.

## Strictness (user, 2026-10-19)

Four levels: Very strict, Strict, Regular, Soft. A level turns LootSnob v4 rules on and off. It never changes a
threshold. The level table is data in one JSON file.

**Gear tiers** (the sub-sections of Armor, Cloth Armor, Clothing and Jewelry):

| Level | Legendary, Legendary Sets | Ward/Impen, Ward | Epic, Epic Sets | Major, Major Sets, Other Sets, Other |
|---|---|---|---|---|
| Very strict | on | off | off | off |
| Strict | on | on | off | off |
| Regular | on | on | on | off |
| Soft | on | on | on | on |

**Ladders:** a ladder is a run of rules next to each other in one section whose names are the same after every
digit run becomes `#`. Examples: `(H) Axe (OD +10)` to `(H) Axe (OD +1)`, `(W) No Wield (29MD)` to `(21MD)`,
`(ME) 40k` and `(ME) 30k`. The first rule is the best rung. A level keeps the top rungs and turns the rest off:

| Level | Rungs on |
|---|---|
| Very strict | top 2 |
| Strict | top 4 |
| Regular | top 6 |
| Soft | all |

Ladders apply in Melee Weapons, Missile Weapons and Wands, and in Cloaks. In Cloaks, the whole section is one
ladder in file order (an assumption: LootSnob lists the best cloaks first).

**Value and Death Items** (off in LootSnob): Soft turns on all rungs, Regular the top 6 rungs of each ladder.
Strict and Very strict keep them off.

**Not touched by strictness:** Trophies stay separate on/off choices in the character step. Tailoring,
Tailoring (Special) and Salvage stay as the file has them, and the user turns them on by hand. Item Only and
Shields also stay as the file has them. Each of their rules is a ladder of one rung. So the ladder rule would
turn all of them on at every level (Wren, 2026-10-19).

A one-rung ladder is on at every level. Melee Weapons has 120 of them, for example `(H) 430 Insane` (counted by
Wren on LootSnob v4).

**Character:** the weapon choice keeps only the matching weapon rules on, by name prefix: `(H)` heavy, `(L)`
light, `(F)` finesse, `(M)` missile, `(W)` wand. Rules of other weapon types go off.
- **Sample items:** H3 starts with a small set made by hand from the fixtures' rules. A real item import needs a
  data source.

## Done

- Each phase's pages match the approved mockups in layout and colors.
- All tests pass, including the round-trip gate and an evaluator test for each of the 31 requirement types.
- The GitHub Pages build works.
