---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424751'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727783'
  outline-variant: '#c2c6d3'
  surface-tint: '#175ead'
  primary: '#003e7a'
  on-primary: '#ffffff'
  primary-container: '#0055a4'
  on-primary-container: '#afccff'
  inverse-primary: '#a8c8ff'
  secondary: '#006b5c'
  on-secondary: '#ffffff'
  secondary-container: '#68fadd'
  on-secondary-container: '#007261'
  tertiary: '#3c3f41'
  on-tertiary: '#ffffff'
  tertiary-container: '#535658'
  on-tertiary-container: '#c9cbcd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#004689'
  secondary-fixed: '#68fadd'
  secondary-fixed-dim: '#44ddc1'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005145'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  sidebar-width: 260px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-utility pharmacy environments where speed and accuracy are paramount. The brand personality is grounded in **trustworthy efficiency**; it avoids decorative flourishes in favor of a **Corporate/Modern** aesthetic that emphasizes clarity and task completion.

The visual style utilizes a refined flat design approach with generous whitespace to prevent cognitive overload in complex data-heavy views. The UI feels clinical yet modern, evoking a sense of calm reliability through structured alignment and a "data-first" hierarchy.

## Colors
The palette is rooted in medical professionalism. **Deep Medical Blue** serves as the primary driver for navigation and primary actions, establishing authority. **Clean Mint Green** is used strategically for success states, active inventory indicators, and secondary supportive actions. 

The background relies on a tiered system of soft grays and pure white to differentiate between the dashboard workspace and utility panels. Text contrast is strictly maintained using a slate-based neutral scale to ensure legibility during long shifts.

## Typography
**Inter** is the core typeface for its exceptional legibility and neutral tone, performing equally well in English and its Arabic counterparts. 

- **Headlines:** Use Bold and Semi-Bold weights to create a clear information architecture.
- **Body:** Standardized at 16px for readability, with 14px reserved for secondary metadata or dense table rows.
- **Data:** For pharmaceutical SKU numbers and dosages, a secondary monospaced font (JetBrains Mono) is recommended to ensure numerical alignment in inventory lists.
- **Alignment:** Consistent 4px baseline snapping for all type blocks.

## Layout & Spacing
The layout follows a **Fixed Sidebar + Fluid Content** model. The main workspace uses a 12-column grid system designed for dashboard modules.

- **Desktop:** 24px outer margins with 16px gutters between cards.
- **Tablet:** Sidebar collapses to an icon-only rail (72px); margins reduce to 16px.
- **Mobile:** Single column flow; bottom navigation replaces the sidebar.

Vertical rhythm is strictly 8px-based. Elements should be grouped into cards with 24px internal padding to provide the "breathable" feel required for a modern management interface.

## Elevation & Depth
This design system uses **Tonal Layers** and **Low-contrast outlines** to define hierarchy, avoiding heavy shadows to maintain a clean, clinical feel.

- **Level 0 (Background):** #F8FAFC (Soft Gray).
- **Level 1 (Cards/Work Area):** White surface with a 1px border in #E2E8F0.
- **Level 2 (Modals/Popovers):** White surface with a very soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.05)) to separate the element from the workspace.

Interactions (hovers) are indicated by subtle shifts in background color rather than changes in elevation.

## Shapes
The shape language is **Soft (0.25rem)**. This subtle rounding removes the harshness of a purely industrial tool while maintaining a professional, structured grid. 

- **Standard Buttons/Inputs:** 4px radius.
- **Container Cards:** 8px (rounded-lg) to frame large blocks of content.
- **Selection Indicators:** Small vertical pills or bars (2px radius) used in navigation sidebars.

## Components
### Buttons
- **Primary:** Solid Medical Blue (#0055A4) with white text. High emphasis.
- **Secondary:** Outlined Mint Green (#00BFA5) with 1px stroke. Used for additive actions like "Add New Medicine."
- **Ghost:** Minimal slate text for low-priority actions like "Cancel" or "Export."

### Input Fields
Inputs use a white background with a 1px #E2E8F0 border. On focus, the border transitions to Primary Blue with a 2px soft outer glow. Labels are always persistent above the field in `label-caps` style.

### Data Tables
The heart of the application. Rows should have a height of 48px to 56px. Use alternating row stripes (Zebra striping) in #F8FAFC for large datasets. High-priority status indicators (In Stock, Low Stock, Expired) use Mint Green or warning tones in a "Chip" format.

### Icons
Use 2px stroke, minimalist icons. Medical icons (crosses, pills, prescriptions) and management icons (charts, users, settings) must share the same line weight and terminal cap style (rounded).

### Cards
All dashboard modules reside in cards. Card headers should be separated by a 1px horizontal divider and contain a title and contextual actions.