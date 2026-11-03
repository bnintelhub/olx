# Design System और Admin Shell Plan

## Goal

Admin के सभी modules को एक ही visual language में रखना है। Users, Listings, Categories, Reports और Settings के लिए अलग-अलग layout invent नहीं करना है।

## Shared layout

### Desktop

- Fixed left sidebar
- Top header with breadcrumb, global search, notifications और profile menu
- Main content में consistent max-width और page padding
- Sidebar collapse/expand support

### Tablet/mobile

- Sidebar drawer
- Header में menu button
- Tables horizontal scroll या card layout में बदलें
- Forms single-column हों
- Actions overflow menu में जाएं

## Shared components to create/reuse

| Component | Responsibility |
|---|---|
| `AdminShell` | Sidebar, header, page outlet और responsive layout |
| `PageHeader` | Breadcrumb, title, description और primary action |
| `StatCard` | Metric, trend और loading state |
| `DataTable` | Sticky header, sorting, pagination, empty/error state |
| `StatusBadge` | Active, pending, rejected, suspended आदि semantic colors |
| `FilterBar` | Search, select, date और clear filters |
| `FormField` | Label, hint, validation और error |
| `ConfirmDialog` | Delete, reject, suspend जैसे destructive actions |
| `Toast` | Success, warning और error feedback |
| `EmptyState` | No data और next action guidance |
| `LoadingSkeleton` | Page, cards और table loading |
| `Drawer/Modal` | Detail और edit workflows |

## Visual rules

- Neutral surfaces और एक primary OLX ORBIT brand color।
- Green success, amber warning, red destructive/error, blue informational status।
- Heading hierarchy consistent रखें: page title, section title, field label।
- Buttons में text और icon दोनों का अर्थ स्पष्ट हो।
- Focus ring visible हो; केवल color से state communicate न करें।
- Dense admin tables में row height और spacing consistent रखें।

## Shared UX states

हर API-driven page में:

1. Initial loading
2. Loaded data
3. Empty result
4. API error with retry
5. Mutation pending/disabled
6. Mutation success toast
7. Mutation failure toast
8. Permission denied state

## Implementation sequence

1. Existing `AdminPortal` से sidebar/header patterns निकालें।
2. Shared components बनाएं।
3. पहले Dashboard को नए shell पर migrate करें।
4. फिर Listings, Categories, Reports और Users को उसी shell में जोड़ें।
5. पुराने duplicated layout/styles हटाएं, लेकिन unrelated behavior न बदलें।

## Current implementation status

The first reusable foundation is available under `frontend/src/admin/components`:

- `layout/AdminPageHeader.tsx`
- `data-table/AdminDataTable.tsx`
- `data-table/AdminStatusBadge.tsx`
- `filters/AdminFilterBar.tsx`
- `feedback/AdminFeedback.tsx`
- `feedback/AdminErrorBoundary.tsx`
- `forms/AdminConfirmDialog.tsx`

`AdminPortal` uses the page header, status badge and feedback primitives for listings and moderation. The remaining feature screens can adopt the same primitives during their respective implementation phases.
