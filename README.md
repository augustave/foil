# foil

An interactive airfoil configuration study focused on how flaps and slats affect lift, pitching moment, and stall behavior.

Live site: [https://augustave.github.io/foil/](https://augustave.github.io/foil/)

<img width="561" height="272" alt="Screenshot 2026-04-09 at 11 47 05 AM" src="https://github.com/user-attachments/assets/c6b52dc2-04ab-4f1c-a5ba-4ef0e75219ec" />

## What it does

- Compares six airfoil configurations from baseline through multi-element high-lift systems
- Lets you vary flap and slat deployment interactively
- Shows an optional lift-vs-angle graph for quick comparison
- Explains each configuration through device change, flow response, performance outcome, main benefit, tradeoff, and typical use

## Stack

- React
- Vite
- Tailwind CSS
- `lucide-react`

## Local development

```bash
npm install
npm run dev
```

The dev server will print a local URL, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Deployment

GitHub Pages deploys automatically from `main` using the workflow in `.github/workflows/deploy.yml`.

Because the site is served from the repository path, Vite is configured with:

```js
base: '/foil/'
```

## Project structure

```text
.
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
└── vite.config.js
```

## Notes

This is an instructional visualization, not a validated aerodynamic simulator or wind-tunnel reconstruction.
