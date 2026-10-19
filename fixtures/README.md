# Fixtures

Copied on 2026-10-19 from `../ac-loot-editor/VirindiTankClassicLooter/`. Git keeps their bytes (`.gitattributes`).
The line endings are CRLF.

| File | Rules | Origin |
|---|---|---|
| LootSnobV4.utl | 1627 | Community profile. Origin: legacy editor (Observed: file header, CRLF). |
| ILT_Legendary.utl | 1632 | Community profile. Same origin as LootSnobV4. |
| IAC_Level_NoCash.utl | 56 | Community profile. |
| IAC_Level_ONLYCash.utl | 56 | Community profile. |
| UnfamilarShores.utl | 5 | Community profile. |
| BuffedLongBuffedDouble.utl | 7 | Unknown writer. The earlier rebuild (ac-loot-editor-ui) maybe saved it. |
| vtclassic_editor_minimal.utl | 1 | Unknown writer. Maybe made for the earlier rebuild's tests. |
| vtclassic_editor_rich.utl | 1 | Unknown writer. Maybe made for the earlier rebuild's tests. |
| ColorSlots.Default.xml | | The legacy editor's default color slots. |

Byte equality after a round-trip is the target for the community profiles. For the "unknown writer" files, a
difference can be correct. T15 records each one in `docs/format.md`.
