# ZenStudios — Quotations, Projects & Margin

A local-first application for **OMHome Services Private Limited** (trading as ZenStudios) that
generates GST-compliant quotations, tracks converted opportunities to delivery, and reports on
where the money actually went.

Everything runs on your machine. The whole database is one file you can copy.

---

> **Using the app day to day? Read the [User Guide](docs/USER-GUIDE.md).**
> This file covers installation and how the thing is built.

## Getting started

```bash
cp server/.env.example server/.env
cp server/company.example.json server/company.json   # fill in your CIN, PAN, TAN, address
npm run setup
```

`server/company.json` is gitignored on purpose — it carries your statutory identifiers. It only
decides what a brand-new database starts with; everything is editable afterwards under Settings.

That installs dependencies, creates the database and loads your company details, the three lines of
business with their pipelines, and a 232-item starter catalog.

### As a Mac app (recommended)

```bash
npm run app:dist
```

Produces `desktop/release/ZenStudios-1.0.0-arm64.dmg`. Install it, then open **ZenStudios** from
Applications — the API, the database and PDF generation all run inside the app, with no terminal.

Because the build is not signed with an Apple certificate, macOS blocks it the first time:
**right-click the app → Open → Open**. Once only.

Already have data from the terminal version? Bring it across with:

```bash
npm run app:import-data
```

`npm run app` runs the same desktop app from source without building a dmg.

### From the terminal

```bash
npm run dev
```

Open **http://localhost:5273**. The API runs alongside on port 4321.

> The Mac app and the terminal version keep **separate databases** —
> `~/Library/Application Support/ZenStudios/data` and `data/` respectively.

### First five minutes

1. **Settings → Company** — add your **GSTIN** (it was not supplied, so it is blank) and upload your
   logo. Until the logo is uploaded, documents print a ZenStudios wordmark.
2. **Settings → Bank & terms** — add bank and UPI details so they appear on every document.
3. **Rate card & products** — the starter catalog is a plausible guess. Correct the rates and,
   importantly, the **cost prices** — those are what make the margin figures real. If you already
   have a rate card as a PDF or spreadsheet, see *Importing your rate card* below.
4. **Quotations → New quotation** — build one and print it.

---

## How it fits together

```
Quotation ──(accept)──▶ Project ──▶ stages ──▶ tasks · notes · screenshots
    │                      │
    │                      ├─▶ Expenses  ──┐
    └─▶ Invoice ──▶ Payments ──────────────┴─▶ Reports
```

**Quotations** carry a line of business, a client, and either room-wise sections (Interior) or a
flat product list (B2B). Every line has a selling rate *and* a cost price, so the editor shows live
margin as you type. Quotations can be revised (keeping a version history), duplicated, archived, and
converted.

**Projects** are converted opportunities. Each line of business has its own pipeline; a project
moves stage by stage, and every move is logged. Projects hold tasks (assignable to teammates by
name), notes, screenshots and other attachments, expenses, and invoices. Several projects can be
open at once as tabs, and the tab strip survives a page reload.

**Invoices** are raised from a quotation — either the full scope or a percentage milestone — as a
proforma or a tax invoice. Payments recorded against an invoice move it to partially paid or paid
automatically.

**Reports** cover project P&L, receivables ageing, and the spread of rates you have actually
quoted per item. Each exports to CSV.

**Market benchmark** is where competitor quotations live. See the note below.

---

## Importing your rate card

**Rate card & products → Import PDF** reads a rate card PDF — or a photo of a printed one — into the
catalog. It transcribes what is printed and nothing more: no price is converted or adjusted.

Nothing is saved until you approve it. The parsed rows land in a review table where you can edit any
field, and it flags what it is unsure about:

- **Rows already in your catalog** are matched by name and unit, shown with their current rate, and
  left **unticked** — so re-importing an updated rate card updates rates in place instead of
  creating a second copy of every item. Tick one and it becomes a rate update rather than a new row.
- **Units it had to normalise** (`sft` → `Sq.ft`, `rft` → `R.ft`, `LS` → `Lump sum`) are labelled.
- **Rates it could not read** come through as 0 with an amber outline, rather than being dropped.
- **GST-inclusive rate cards** get a warning: catalog rates should be GST-*exclusive*, because tax is
  added on the quotation.
- **Missing cost prices** are counted, since most rate cards only print selling rates and those rows
  will otherwise show 100% margin.

There is a free-text box for anything the document does not say — *"rates are per running foot"*,
*"ignore the labour column"*. This needs an API key; **Import CSV** does not, and takes columns in
the order `name, sku, brand, category, unit, rate, cost, hsn, gst, spec`.

The uploaded file is used only to produce the rows and is deleted immediately afterwards.

## Lines of business

| | Quotes grouped by | Catalog | Numbering |
|---|---|---|---|
| **Interior Design** | Room | 144 items — kitchen and wardrobe shutter finishes, bed configurations, wardrobe internals and lighting, ceilings, finishes, flooring | `ZS/INT/…` |
| **Retail & Commercial Branding** | Zone | 78 items — signage, ACP facade, shopfront glazing, display fixtures, graphics, site services | `ZS/RTL/…` |
| **B2B Procurement & Resale** | Not grouped | 10 items — furniture and fit-out products for resale | `ZS/B2B/…` |

Each carries its own pipeline, default terms and document series. Adding a fourth needs no code —
Settings → Lines of business.

### Updating the starter catalog

Catalog data lives in `server/src/data/`, read by both the fresh-install seed and the sync script, so
the two can never drift. To add items to a database that is already in use:

```bash
npm run catalog:sync          # the terminal version's database
npm run catalog:sync:app      # the Mac app's database
```

The sync is **add-only**. It creates lines of business and catalog items that are missing and never
edits or deletes anything, so rates and cost prices you have corrected survive every update.

## GST handling

- Every quotation and invoice can run in **full GST** mode (per-line HSN/SAC and GST rate) or
  **flat rate** mode (one rate across the document). Choose per document.
- **CGST + SGST vs IGST is decided automatically** by comparing your state code with the place of
  supply. The place of supply defaults to the client's state, which is itself derived from the first
  two digits of their GSTIN. You can override it on any document.
- A document-level discount is spread across lines in proportion to their value, so each line still
  carries the correct tax.
- Totals are rounded to the nearest rupee with the round-off shown explicitly, and the amount is
  printed in words using Indian lakh/crore notation.
- Document numbers are per line of business and restart every April:
  `ZS/INT/26-27/001`, `ZS/B2B/26-27/001`, `ZS/INV/26-27/001`.

---

## Budget vs actuals

A project shows **two** cost figures, deliberately kept apart:

| Figure | What it is |
|---|---|
| **Budgeted cost** | The cost prices on the quoted lines — the plan |
| **Spent so far** | Expenses actually booked against the project — the reality |

They are never added together, because the same material would be counted twice. The project header
shows budgeted profit and how much of the budget has been consumed; the Money tab shows profit at
actuals alongside it.

---

## Market benchmark — and the wall around it

You can upload competitor quotations (PDF or a photo) as market intelligence. With an Anthropic API
key configured, each upload is read and you get:

- a factual summary and a note on how the document is structured,
- every line item it could read, extracted,
- pricing patterns, commercial terms, strengths, and red flags,
- a critical appraisal written for you, and
- suggestions about **document craft only** — clarity, specification depth, exclusions, terms.

**This never touches your pricing.** That is enforced in three places, not just by prompt wording:

1. The `CompetitorQuote` table has **no relation** to `Quotation` or `CatalogItem`.
2. There is **no endpoint** that copies a competitor line into a quotation or the rate card.
3. The model is instructed never to recommend a price, rate, margin, discount, or positioning move —
   only to describe and critique what the competitor did.

Your own rate benchmark — the min, median and max you have actually quoted per item — lives
separately under **Reports → My rate history**, and is built only from your own sent and accepted
quotations.

To enable the analysis, paste an API key from [console.anthropic.com](https://console.anthropic.com)
into **Settings → AI & system**, or put `ANTHROPIC_API_KEY=` in `server/.env`. Without a key,
uploads are still stored and text-extracted; only the analysis step is skipped.

---

## Adding a new line of business

**Settings → Lines of business → Add.** Give it a name, a short code for document numbers, and pick
whether its quotations are grouped into sections (rooms, areas, phases) or a single flat list. It
gets its own numbering series, pipeline, catalog and default terms immediately — no code changes.

---

## Your data

| Path | Contents |
|---|---|
| `data/app.db` | The entire database (SQLite) |
| `data/uploads/` | Attachments and competitor documents |
| `data/branding/` | Your logo |
| `data/secrets.json` | The API key, if stored through the UI |

Back up the `data/` folder and you have backed up everything.

---

## Commands

| Command | What it does |
|---|---|
| `npm run setup` | Install, create the database, seed |
| `npm run dev` | Run in the browser (web on 5273, API on 4321) |
| `npm start` | Build the web app and serve everything from the API on 4321 |
| `npm run app` | Run the Mac app from source |
| `npm run app:dist` | Build the installable `.dmg` |
| `npm run app:import-data` | Copy `data/` into the Mac app's data folder |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run catalog:sync` | Adds new starter catalog items and lines of business **without touching rates you have edited** |
| `npm run catalog:sync:app` | The same, against the Mac app's database |
| `npm run db:reset` | **Deletes all data** and reseeds a clean install |

## How the Mac app is put together

`desktop/` is an Electron shell around the same server and UI — not a reimplementation.

- The Express API starts **inside** the app's main process on an OS-assigned free port, so it never
  collides with anything already running.
- Data lives in `~/Library/Application Support/ZenStudios/data`, outside the bundle, so an app update
  never touches it.
- On first launch a **pre-seeded template database** is copied into place. Preparing it at build time
  means the packaged app never has to run Prisma's migration engine.
- PDFs are rendered by **Electron's own Chromium** via `printToPDF`, so Puppeteer is not shipped —
  around 180 MB saved, and PDF export always works.
- The server's runtime dependencies are staged into `Resources/app/node_modules` (see
  `desktop/scripts/stage-runtime.mjs`), pruned of other platforms' Prisma engines and type
  declarations.
- **ZenStudios → Server…** switches between the local database and a company server. That is the
  upgrade path: deploy this same server centrally and point the app at it.

---

## Sharing between machines — `.zns` files

Each install has its own database, so setup and documents move as **`.zns` files** (JSON under the
extension). Two kinds, distinguished by a `kind` field the app reads:

| Kind | Written by | Carries |
|---|---|---|
| `zenstudios.setup` | Settings → Share & transfer → Export setup file | Organisation, logo, business types with stages, optionally the catalog |
| `zenstudios.quotation` | A quotation's **Share as file** | One quotation with its sections, lines, client and terms |

Endpoints are under `/api/transfer`. Two properties matter:

- **Setup import is add-only.** The organisation record is overwritten; business types and catalog
  items that already exist are never modified, so corrected rates survive re-import.
- **A quotation import is a rebuild, not a copy.** The receiving install issues its own number,
  matches or creates the client, and recomputes every total against its own place of supply — so a
  document crossing a state boundary correctly flips between CGST + SGST and IGST.

Cost prices are opt-in on quotation export (`?costs=1`) and opt-out on setup export. The Mac app
registers `.zns` as a file association and imports on `open-file`, so double-clicking one works.

## Moving off this machine later

The app was built local-first but not painted into a corner:

- The API and web app are separate; the frontend only ever calls relative `/api` paths.
- All data access goes through Prisma. Moving to a hosted Postgres is a provider change in
  `server/prisma/schema.prisma` plus a new `DATABASE_URL`.
- There is no authentication yet — that is the one thing to add before exposing this beyond your own
  machine. The data model already carries an `assignee` on tasks and an `author` on notes, so
  attaching real user accounts is additive rather than a rewrite.
