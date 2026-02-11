# GEMINI.md - led.run Project Context

## Project Overview
**led.run** is a minimal, web-based digital signage application. It allows users to display text on a digital screen simply by modifying the URL (e.g., `led.run/HELLO`). The project emphasizes simplicity, utilizing pure vanilla JavaScript and CSS without any build steps or external frameworks.

### Key Technologies
- **Frontend:** Vanilla JavaScript (ES5/ES6), CSS3.
- **Architecture:** Modular IIFE (Immediately Invoked Function Expression) patterns.
- **Hosting/Deployment:** Cloudflare Pages with SPA rewrites via `_redirects`.
- **Logic:** Dynamic theme system with auto-fitting text engine.

---

## Architecture & Core Modules

### 1. Core Engine (`js/core/`)
- **`url-parser.js`**: Responsible for extracting the display text from the URL path and parsing query parameters (e.g., `?t=neon&c=ff0000`) into a configuration object.
- **`text-engine.js`**: A utility for calculating the optimal font size to fit text within a given container (auto-fit logic).
- **`text-manager.js`**: The central registry for themes. It manages theme registration, dynamic loading, and switching between themes.

### 2. Theme System (`themes/{id}/`)
Themes are autonomous modules consisting of:
- **`renderer.js`**: Implements the theme logic. Each theme must register itself with `TextManager` and implement an interface:
  - `init(container, text, config)`: Sets up the theme.
  - `destroy()`: Cleans up resources/event listeners.
  - `togglePause()` / `isPaused()`: (Optional) Handles playback state.
- **`style.css`**: Contains theme-specific styling.

### 3. UI Components (`js/ui/`)
Modular utilities for browser features, often adapted from `til.re`:
- **`fullscreen.js`**: Wrapper for the Fullscreen API.
- **`wakelock.js`**: Wrapper for the Screen Wake Lock API to prevent the screen from dimming.
- **`cursor.js`**: Logic to auto-hide the mouse cursor after inactivity.
- **`controls.js`**: Handles global input (keyboard shortcuts like `Space` or `F`, and pointer events).

### 4. Application Entry (`js/app.js`)
The orchestrator that initializes the `URLParser`, selects the theme via `TextManager`, and sets up the UI components. It also handles the "Landing Page" view when no text is provided in the URL.

---

## Development & Operations

### Building and Running
This project has **no build step**. It can be served locally using any static file server.
- **Recommended Command:** `npx serve .`
- **Entry Point:** `index.html`

### Deployment
- **Platform:** Cloudflare Pages.
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) triggers on push to `main`.
- **Configuration:** `_redirects` handles SPA-style routing, ensuring all paths are served by `index.html`.

### Coding Conventions
- **Module Pattern:** All files are wrapped in IIFEs to avoid global namespace pollution while selectively exporting to `window`.
- **Strict Mode:** `'use strict';` is used in all JS files.
- **Styling:** CSS variables are used extensively for theme customization (colors, backgrounds).
- **Parameter Aliasing:** Short aliases are supported (e.g., `t` for `theme`, `c` for `color`).
- **Container Dimensions:** Themes must use `this._container.clientWidth/clientHeight` (or CSS `100%`) for sizing, never `window.innerWidth/innerHeight` (or CSS `100vw/100vh`). Toolbar rotation swaps the container's width/height via CSS classes while the viewport stays the same.
- **No Inline Transform on Container:** Themes must never set inline `transform` on the `#sign-container` element — toolbar rotation uses CSS class `transform` on it. Use an inner wrapper div for theme transforms like `scale()`.

---

## Extending the Project

### Adding a New Theme
1. Create a new directory in `themes/{id}/`.
2. Add `style.css` and `renderer.js`.
3. In `renderer.js`, call `TextManager.register(MyNewTheme)`.
4. Register the new theme in `index.html` by adding the corresponding `<link>` and `<script>` tags.
5. (Optional) Add the theme to the examples on the landing page in `js/app.js`.
6. **Important:** Ensure the theme uses container dimensions (`this._container.clientWidth/clientHeight` or CSS `100%`) instead of viewport dimensions, and never sets inline `transform` on `#sign-container`. See "Coding Conventions" above for details.

### Adding a New UI Module
1. Create a file in `js/ui/`.
2. Implement the logic using the IIFE pattern.
3. Include the script in `index.html` before `js/app.js`.
4. Initialize the module within `App.init()` in `js/app.js`.
