/**
 * The menu bar of the legacy editor (ref/editor/Form1.Designer.cs 163-327).
 * The top-level items are File, Edit, Rule and Combine. A click opens the
 * dropdown with the C# item texts. The shortcut keys (Ctrl+C, Ctrl+V, Ctrl+S,
 * Ctrl+O) live in App.tsx. The C# puts them on the menu items
 * (Form1.Designer.cs 193, 203, 218, 255, 263).
 */
import { useEffect, useRef, useState } from 'react'

export const MENU_ITEMS = {
  File: ['New', 'Open', 'Save', 'Save As', 'Exit'],
  Edit: ['Copy Rule', 'Paste Rule', 'Paste Rule Unchecked (Dangerous)'],
  Rule: [
    'Add/Update Salvage Rules',
    'Update Workmanship Requirements',
    'Auto-Sort Rules',
    'Add Packslot Requirements',
  ],
  Combine: ['Export Ranges', 'Import Ranges'],
} as const

export type MenuName = keyof typeof MENU_ITEMS

export function MenuBar({ onPick }: { onPick: (menu: MenuName, item: string) => void }) {
  const [open, setOpen] = useState<MenuName | null>(null)
  const navRef = useRef<HTMLElement>(null)
  // A WinForms dropdown closes on a click outside. The listener runs after the
  // clicked button, so a menu item still gets its click (App tests rely on it).
  useEffect(() => {
    if (open === null) return
    function onClick(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])
  return (
    <nav ref={navRef} aria-label="Main menu">
      {(Object.keys(MENU_ITEMS) as MenuName[]).map((menu) => (
        <span key={menu}>
          <button
            type="button"
            aria-expanded={open === menu}
            onClick={() => setOpen(open === menu ? null : menu)}
          >
            {menu}
          </button>
          {open === menu && (
            <ul aria-label={`${menu} menu`}>
              {MENU_ITEMS[menu].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(null)
                      onPick(menu, item)
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
      ))}
    </nav>
  )
}
