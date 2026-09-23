# 📋 TiffinFlow - Project Changelog & Revision History

This document tracks all features, architectural improvements, and UI enhancements implemented across releases.

---

### [Latest] - 2026-09-23
#### 📱 Mobile Orientation & Layout Polish for Food Statement & PDF Modal
- **2x2 Summary Metrics Grid:** Transformed the 4 summary stat cards (`TOTAL DEBITED`, `MEALS SERVED`, `CARRY-OVER CREDIT`, `REMAINING IN PLAN`) from a cramped 4-column layout into a clean, balanced 2x2 grid. Metric titles, values, and subtitles now fit naturally without vertical text wrapping.
- **Fixed Button Clipping in Footer:** Re-architected bottom action buttons from an overflowing 3-column row to a two-tier layout (`Download PDF` & `Export CSV` side-by-side, with `Copy WhatsApp Text Summary` cleanly beneath). Eliminates the cut-off button edge on iPhones.
- **Statement Header & Scope Ref Wrapping:** Added `flex-wrap: wrap`, `font-family: monospace`, and `white-space: nowrap` to Reference IDs (`TF-STMT-...`) so they never break mid-hash.
- **Table & Modal Viewport Fit:** Adjusted modal padding to `14px 12px` and enabled horizontal touch scrolling on the daily transaction ledger table to prevent horizontal page distortion on mobile viewports.

---

### 2026-09-23 · Commit `3989e88`
#### 🛠️ Mobile Calendar Framing, Funds Clarity, Light Theme Polish & Log Scaling
- **Calendar Mobile Framing:** Fixed horizontal cell overflow clipping on iPhones and narrow mobile devices (360px–390px) by configuring `.calendar-grid` with `repeat(7, minmax(0, 1fr))`, `min-width: 0`, and adjusting container padding so Saturday (column 7) fits cleanly with safe margins.
- **Money Left in Plan Clarity:** 
  - Added `white-space: nowrap` to prevent the percentage badge from breaking into multiple lines (`85% Funds \n Left` → `85% Remaining`).
  - Rewrote the subtext to explicitly separate remaining vs spent (`₹1,700 left · ₹300 spent of ₹2,000 total plan value`), removing confusion between remaining balance and consumption percentage.
- **Light Theme "Edit Past History" Overhaul:** Eliminated dark slate backgrounds in light mode. Created `.edit-history-card`, `.edit-history-badge`, `.edit-history-preset-btn`, and `.edit-history-preview` providing soft lavender gradient backgrounds, crisp white preview cards, and WCAG AAA compliant text contrast.
- **Decluttered Monthly Reports:** Removed all redundant `X logs in [Month]` text and pill badges across the section header, month selector trigger button, and month picker modal list.
- **Activity Logs Count & Scalable Pagination:**
  - Removed the raw count `(3)` from the title (`Activity Logs · September 2026`).
  - Introduced smart scaling: defaults to the most recent 7 days of activity with a seamless iOS-style **"View Full Month Activity ▾"** toggle for months with more than a week of logs.

---

### 2026-09-23 · Commit `b749bde`
#### ⚡ Simulator & Iframe No-Cache Meta Tags
- Added `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />` and `<meta http-equiv="Pragma" content="no-cache" />` to `index.html`.
- Prevents Chrome extensions, phone emulators (e.g. Phone Simulator Pro), and web iframes from caching old bundles and delaying live updates.

---

### 2026-09-23 · Commit `a6ce05a`
#### 📅 4-State Visual Calendar & Dedicated "Plan" Creation Tab
- **4-State Visual Indicators:**
  - **Delivered (Green):** Confirmed meal delivered for the day.
  - **Skipped / Off (Red):** Meal skipped or cook took leave (credited & carried over).
  - **In Plan (Blue):** Active subscription day awaiting delivery.
  - **No Delivery (Neutral):** Non-delivery day (e.g. Sundays or outside subscription window).
- **Plan Tab Redesign:** Converted the Plan tab into a dedicated creation & subscription management center, allowing users to configure new custom plans (rate per meal, persons, inclusions) with 1 tap.

---

### 2026-09-23 · Commit `1a377e7`
#### 🎨 Light Theme Readability & High Contrast Ratios
- Audited all colors for WCAG 2.1 AA/AAA compliance.
- Upgraded light theme backgrounds from plain white to subtle layered card surfaces (`#f8fafc`, `#e2e8f0` borders).
- Swapped low-contrast yellow/light-green fonts for deep accessible tokens (Amber-700 `#b45309`, Emerald-700 `#047857`, Slate-900 `#0f172a`).

---

### 2026-09-23 · Commit `fe9a9c3`
#### 🌓 Dark & Light Theme Switcher
- Added interactive Theme Toggle in **My Profile** tab with options:
  - 🌙 **iOS Dark (Default)**: Apple dark slate palette.
  - ☀️ **Clean Light**: High-contrast white and soft grey palette with crisp card outlines.
- Persistent state saved to `localStorage` across page reloads.

---

### 2026-09-22 · Commit `529f66d`
#### 🧾 Food Statement & Elder-Friendly Bank-Style PDF
- Clubbed the Food Statement card and WhatsApp messenger into a unified view.
- Added scope selector: **Current Month**, **Last Month**, or **Entire Subscription Period**.
- Redesigned the downloadable PDF into an elder-friendly bank statement layout with clear tables, large fonts, and itemized breakfast/lunch portions.

---

### 2026-09-22 · Commit `5ecd4ba`
#### 📦 Multi-Plan Switcher & Portal Popups
- Added visual switcher tabs when multiple plans are active, showing money left per plan.
- Upgraded dropdown selectors to React Portals with smooth iOS bottom-sheet slide-up animations.

---

### 2026-09-22 · Commit `c75223b`
#### ℹ️ Decluttered Interface & Info Popovers
- Replaced bulky explanatory text blocks with clean `(!)` info popover badges.
- Keeps primary workflows minimal while offering full operational context on tap.

---

### 2026-09-22 · Commit `d63c289`
#### 📄 Bank Statement PDF Export to WhatsApp
- Integrated `jspdf` and `jspdf-autotable` for generating verified meal expense invoices.
- Supports 1-click sharing directly to caterer / cook on WhatsApp.

---

### 2026-09-21 · Commit `b901e2d`
#### 🔒 Future Date Delivery Guardrails
- Disallowed marking meals as delivered for future dates in Calendar, History, and Carry-Over engines.
- Clamped date selection to present day or past 30 days to protect accounting integrity.
