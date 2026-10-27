# Enterprise Luxury Nexus - Tour CRM Design System & UI Specifications

---
name: Enterprise Luxury Nexus
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
  canvas: '#f8fafc'
  sidebar: '#020617'
  border-subtle: '#e2e8f0'
  status-hold-bg: '#fffbeb'
  status-hold-text: '#92400e'
  status-success-bg: '#ecfdf5'
  status-success-text: '#065f46'
  status-pending-bg: '#eff6ff'
  status-pending-text: '#1e40af'
  status-error-bg: '#fff1f2'
  status-error-text: '#be123c'
typography:
  display-stat:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  header-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  form-label:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-form:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  table-data:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  table-header:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  badge-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  grid-margin: 24px
  grid-gutter: 16px
  table-cell-px: 12px
  table-cell-py: 10px
  form-gap: 16px
  sidebar-width: 260px
---

## Brand & Style

This design system is engineered for high-density Enterprise Resource Planning (ERP) environments, balancing the rigorous data demands of the travel industry with a "Luxury Nexus" aesthetic. The brand personality is professional, authoritative, and precise, yet avoids the coldness of traditional legacy software by utilizing soft shadows and refined geometry.

The design style is **Corporate Modern with a Focus on Information Density**. It prioritizes legibility and spatial efficiency to prevent data overlap in complex workflows. By utilizing a high-contrast separation between navigation and content, the system ensures users remain oriented while managing deep data structures. The emotional response is one of organized reliability and high-tier service.

## Colors

The palette is anchored in a professional **Slate and Blue** spectrum. 
- **Primary Blue** (#2563eb) is reserved for interactive elements and primary actions to drive focus.
- **Surface Layering**: The `canvas` (#f8fafc) provides a low-strain background, while the `sidebar` (#020617) uses a deep navy to create a clear structural hierarchy and reduce visual noise in the main work area.
- **Semantic Colors**: Status indicators use a "Soft Wash" approach—light background tints with high-contrast text—to ensure accessibility without overwhelming the data table rows.

## Typography

This system uses **Plus Jakarta Sans** exclusively to leverage its modern, open counters which maintain legibility at small scales. 

To optimize for high-density ERP screens:
- **ERP Tables**: Use the `table-data` (12px) level. To prevent text wrapping in critical columns (e.g., IDs, Dates, Currency), apply `white-space: nowrap`.
- **Forms**: Use `body-form` (14px) for inputs to ensure touch-targets and readability are sufficient for rapid data entry.
- **Hierarchy**: Emphasize `font-extrabold` (800) for status badges and KPI metrics to create an immediate visual anchor amidst dense text.

## Layout & Spacing

The system employs a **Fluid Grid** with fixed side navigation. The layout is designed to maximize horizontal real estate for expansive data tables.

- **Data Tables**: Use a compact but breathable spacing model (`12px` horizontal padding). Vertical padding is kept at `10px` to allow more rows to be visible above the fold without sacrificing the "Luxury" feel.
- **Reflow Rules**: On Tablet, the sidebar collapses into an icon-only rail. On Mobile, the layout switches to a single-column stack, and data tables must use horizontal scrolling containers with frozen first columns.
- **Breakpoints**: Desktop (1280px+), Tablet (768px - 1279px), Mobile (<767px).

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows** rather than heavy borders.

- **Primary Canvas**: The lowest level is the Slate-50 background.
- **Card Tier**: Cards and data containers sit on the canvas with a 1px `border-slate-200/80` and a very soft, diffused shadow (`shadow-sm`) to indicate elevation.
- **Modal Tier**: Modals use a `backdrop-blur-sm` (6px) and a deeper `shadow-2xl` to isolate the task from the underlying data.
- **Interactions**: Buttons use a tinted shadow matching their brand color (e.g., Blue-600/20) to provide a "glow" effect that feels modern and tactile.

## Shapes

The shape language combines **modern softness with structural stability**. 
- **Cards & Containers**: Set to `12px` (rounded-lg) to provide a friendly, contemporary frame for complex data.
- **Controls (Inputs/Buttons)**: Set to `8px` (standard roundedness) to maintain a crisp, professional look that aligns better with tight grid systems.
- **Status Pills**: Always `rounded-full` to distinguish them clearly from interactive buttons.

## Components

- **Buttons**: Primary actions use a bold blue gradient or solid fill with `font-bold` and 8px corners. Secondary actions are outlined in `slate-300`.
- **Data Tables**: Must include `hover:bg-slate-50/80` for row tracking. Headers are `slate-100` with uppercase bold text. Critical columns (Price, Code) should be right-aligned or centered for quick scanning.
- **Input Fields**: 8px rounded corners with a `2px` focus ring in `blue-500/20`. Use `slate-300` for borders to maintain a subtle presence until active.
- **Badges**: Use the Pill shape. Text must be `uppercase` with `0.05em` letter spacing for maximum readability at the 10px size.
- **Scrollbars**: Custom 6px width with `#cbd5e1` (Slate-300) thumbs to ensure they are visible but unobtrusive within dense tables.
