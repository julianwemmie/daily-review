---
status: done
type: feature
created: 2026-03-05
---

# Replace delete/import buttons with a "Manage" dropdown on the list tab

On the list tab, remove the two separate buttons (delete and import) next to the search bar. Replace them with a single "Manage" dropdown menu (gear icon) that links to existing modals.

## Decisions

- **Layout:** Dropdown menu from a gear button — each item opens its own dedicated modal (reuses existing BulkDeleteModal, ImportModal)
- **Export:** Placeholder/disabled menu item for now — will be implemented in a separate task
- **Scope:** Just three actions: Bulk Delete, Import, Export (placeholder)
- **Filter context:** Inherit current filters (status + tag pills + search) and display them visibly so the user knows what's scoped

## Implementation

1. Replace the Delete + Import buttons in `ListView.tsx` with a single `DropdownMenu` (gear icon + "Manage")
2. Menu items: **Bulk Delete**, **Import**, **Export** (disabled, "Coming soon")
3. Clicking Bulk Delete → opens existing `BulkDeleteModal`
4. Clicking Import → opens existing `ImportModal`
5. Show active filter summary in `BulkDeleteModal` (e.g., "Showing 12 active cards tagged 'react'")
