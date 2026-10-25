/**
 * The slot definitions bundled with the app (specs/armor-preview.md item 11):
 * the shipped ColorSlots.Default.xml, as the C# loads it from the program
 * folder (ref/shared/ColorXML.cs 56-66).
 */
import defaultXml from '../../fixtures/ColorSlots.Default.xml?raw'
import { parseColorSlots } from '../core/gamedata/colorslots'

export const DEFAULT_COLOR_SLOTS: ReadonlyMap<string, readonly number[]> = parseColorSlots(defaultXml)
