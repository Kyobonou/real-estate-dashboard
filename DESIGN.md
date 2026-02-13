# Design System: ImmoDash Real Estate Dashboard

**Project ID:** local-real-estate-dashboard

## 1. Visual Theme & Atmosphere

**Aesthetic:** Modern, Premium, Futuristic Glassmorphism.
The interface uses a deep, dark palette common in high-end SaaS applications. It emphasizes depth through the use of translucent "glass" panels with blurred backgrounds (`backdrop-filter: blur(20px)`), glowing accents, and subtle animated background orbs. The overall feeling is clean, technical, and high-performance.

## 2. Color Palette & Roles

### Primary Colors

* **Electric Indigo (#667eea):** The primary brand color. Used for main buttons, active navigation states, and key highlights.
* **Royal Violet (#764ba2):** The secondary brand color. Often used in gradients alongside Indigo for a dynamic look.
* **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`.

### Backgrounds & Surfaces

* **Midnight Navy (#0f172a):** The main background color (`--bg-primary`).
* **Slate Blue (#1e293b):** Background for secondary sections and input fields (`--bg-tertiary`).
* **Glass Surface:** `rgba(255, 255, 255, 0.05)` with `1px solid rgba(255, 255, 255, 0.1)` border.

### Status & Functional

* **Success Green (#10b981):** Used for "Available" status, confirmed visits, and positive trends.
* **Danger Red (#ef4444):** Used for "Occupied" status, alerts, and critical errors.
* **Warning Gold (#f59e0b):** Used for pending actions or medium-priority notices.

## 3. Typography Rules

* **Font Family:** Inter / System Sans-Serif. Clean, readable, and professional.
* **Headings:** Bold weights (700-800) with tight letter-spacing (-0.5px) for a modern, impactful look.
* **Body:** Regular weights (400-500) with high contrast (#f8fafc) for maximum legibility against dark backgrounds.

## 4. Component Stylings

* **Buttons:** Highly tactile. Large padding, rounded corners (`8px`), and bold gradients. Hover states include glowing shadows and slight lifts.
* **Cards/Containers:** "Glass" effect. Rounded corners (`12px` to `24px`). Subtle white border to define edges against the dark background.
* **Inputs:** Minimalist with dark semi-transparent backgrounds. Highlighted with a primary indigo border and glow when focused.

## 5. Layout Principles

* **Spacing:** Generous whitespace to allow elements to "breathe." Uses a consistent 8px/16px/24px grid.
* **Alignment:** Strong vertical and horizontal alignment to maintain a professional, organized structure.
* **Visual Hierarchy:** Critical stats (KPIs) are presented in large, glowing cards at the top of the dashboard.
