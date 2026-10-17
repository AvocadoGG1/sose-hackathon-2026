# SoSE Hackathon 2026 *(name TBD)*

A web app that connects people with surplus food to people who need it! Users can browse and claim available food, donate food they don't need, and get recipe suggestions based on what's in their cart.

Built for the Society of Software Engineers Hackathon 2026.

## Tech stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/) for dev server & bundling
- [React Router](https://reactrouter.com/) for client-side navigation

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) and npm.

```bash
git clone <repo-url>
cd sose-hackathon-2026/react
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`). 

Other scripts (run from `react/`):

```bash
npm run build    # production build
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

## Pages

| # | Page | Component | Links to | Description |
|---|------|-----------|----------|---------------|
| 1 | Main Menu | `<MainMenu />` | Built | Get Food, Donate Food | Navigation hub — no content of its own, just routes into the app. |
| 2 | Get Food | `<GetFood />` | Checkout | Browse available food, add items to a cart, "Recommend food" button. |
| 3 | Donate Food | `<DonateFood />` | Main Menu | Enter an item (name, quantity, expiration date), add multiple items to a donation list, "Submit Donation" button. |
| 4 | Checkout | `<Checkout />` | Recipes | Review selected items, "Recommend food" button, recipe suggestions panel. |
| 5 | Recipes | `<Recipes />` | Checkout | Recipe suggestions based on what's in the cart, flagging which ingredients are missing, with an "Add missing ingredients" button. |

