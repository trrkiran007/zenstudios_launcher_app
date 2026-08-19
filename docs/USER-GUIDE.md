# ZenStudios — User Guide

Everything you can do in the app, in the order you would normally do it.

For installation and the technical side, see the [README](../README.md).

---

## Contents

1. [Opening the app](#1-opening-the-app)
2. [First-time setup](#2-first-time-setup)
3. [The daily loop](#3-the-daily-loop)
4. [Quotations](#4-quotations)
5. [How GST is worked out](#5-how-gst-is-worked-out)
6. [Turning a quote into a project](#6-turning-a-quote-into-a-project)
6a. [Retail & commercial branding work](#6a-retail--commercial-branding-work)
7. [Expenses and profitability](#7-expenses-and-profitability)
8. [Invoices and payments](#8-invoices-and-payments)
9. [Reports](#9-reports)
10. [Rate card and products](#10-rate-card-and-products)
11. [Market benchmark](#11-market-benchmark)
12. [Settings](#12-settings)
13. [Adding a new line of business](#13-adding-a-new-line-of-business)
14. [Backing up your data](#14-backing-up-your-data)
15. [Keyboard shortcuts](#15-keyboard-shortcuts)
16. [Troubleshooting](#16-troubleshooting)
17. [Sharing with your team](#17-sharing-with-your-team)

---

## 1. Opening the app

**The Mac app.** Double-click **ZenStudios** in your Applications folder, or keep it in the Dock.
Everything runs inside it — there is no terminal and nothing to start first.

The first time you open it, macOS will say it is from an unidentified developer, because the app is
not signed with an Apple certificate. **Right-click the app → Open → Open.** You only do this once.

**From the terminal instead.** If you would rather run it as a web app:

```bash
npm run dev
```

then open <http://localhost:5273>.

> The two keep **separate databases**. The Mac app stores data in
> `~/Library/Application Support/ZenStudios/data`; the terminal version uses `data/` inside the
> project folder. To move what you already have into the Mac app, run `npm run app:import-data`.

---

## 2. First-time setup

Work through these once, in this order. Ten minutes now saves re-issuing documents later.

| # | Where | What to do |
|---|---|---|
| 1 | Settings → Company & documents | Add your **GSTIN**. Until it is set, the dashboard warns you and tax invoices print without it. |
| 2 | Settings → Company & documents | Upload your **logo**. It is embedded directly into PDFs, so use the highest-resolution file you have. Without one, documents print a ZenStudios wordmark. |
| 3 | Settings → Company & documents | Check the registered address and confirm **State = Telangana**. This is what decides CGST+SGST vs IGST on every document. |
| 4 | Settings → Bank & terms | Add bank account, IFSC and UPI so they appear in the payment block. |
| 5 | Settings → Bank & terms | Read the default quotation and invoice terms and edit them to match how you actually work. |
| 6 | Rate card & products | Correct the starter rates **and the cost prices**. Cost price is never shown to a client; it is what makes every margin figure in the app real. |

---

## 3. The daily loop

```
   Client  ──▶  Quotation  ──accepted──▶  Project  ──▶  Invoice  ──▶  Payment
                    │                        │                          │
                    │                        ├─ stages, tasks, notes,   │
                    │                        │  site photos             │
                    └─ revisions             └─ expenses         ───────┴──▶  Reports
```

Nothing forces you down this path — you can raise an invoice without a project, or run a project
without a quotation — but this is the route that keeps margin and receivables accurate end to end.

---

## 4. Quotations

### Creating one

**Quotations → New quotation** (or ⌘N in the Mac app).

1. **Line of business** — this decides the numbering series, the pipeline the project will follow
   later, which catalog you pick items from, and how the quote is grouped. It cannot be changed after
   saving.

   | Line of business | Quote is grouped by | Numbering |
   |---|---|---|
   | **Interior Design** | Room — Modular Kitchen, Master Bedroom, Living | `ZS/INT/…` |
   | **Retail & Commercial Branding** | Zone — Facade & Signage, Shopfront, Sales Floor | `ZS/RTL/…` |
   | **B2B Procurement & Resale** | Not grouped — one flat product list | `ZS/B2B/…` |
2. **Client** — pick one, or press **+** to add a new one without leaving the page.
3. **Title / subject** — this prints as the Subject line, so write it as the client should read it:
   *"Interior fit-out for 3BHK, Kokapet — design, manufacture & installation"*.
4. **Dates** — the quotation date and how long it stays valid (default 15 days).
5. **Tax mode** — see [GST](#5-how-gst-is-worked-out).

### Adding items

For **Interior Design** the quote is grouped into rooms, and for **Retail & Commercial Branding** into
zones. Each one is a section with its own items and its own subtotal — the way both interior and store
fit-out quotes are normally read.

- Rename a section by clicking its title (*Living Room*, *Master Bedroom*, *Modular Kitchen*…).
- **Add room** (or **Add zone**) adds another section; the arrows reorder them; the bin removes one.
- **Catalog** opens your rate card — set a quantity against any item and it comes across with its
  rate, cost price, HSN/SAC, GST rate and specification.
- **Add line** creates a blank row to type directly.

For **B2B Procurement** there is a single list of products, with no sections.

Each line has:

| Field | Notes |
|---|---|
| Description | What the client reads |
| Specification | The second, smaller line — material, brand, finish, hardware. This is what stops scope arguments later |
| HSN/SAC | Only shown in full GST mode |
| Unit | Sq.ft, R.ft, Nos, Set, Lump sum… |
| Qty / Rate | The selling side |
| **Cost** | **Never printed.** Your cost for that line. The small percentage under it is that line's margin, and turns amber below 15% |
| Disc% | A discount on that line alone |
| GST% | Per line, in full GST mode |

### Watching the margin

The right-hand panel updates as you type:

- **Totals** — subtotal, discount, taxable value, the tax split, and the grand total.
- **Profitability** — revenue excluding GST, cost of items, gross profit and margin, with a bar that
  turns amber below 15%. This panel is internal and never appears on any printed document. Margin
  shows **—** when the document carries no cost prices at all, which is normal on a quotation someone
  shared with you.

A document-level discount (percentage or amount) is spread across the lines in proportion to their
value, so each line still carries the right tax.

### If the save button is greyed out

**Create quotation** stays disabled until the document is valid, and the reason is printed next to
it. A quotation needs three things: a **client**, a **title**, and **at least one line with a
description**. Fill in whatever the message names and the button turns green.

### Nothing you type is lost

Every edit is mirrored to this Mac a moment after you stop typing, so a reload, a crash, or leaving
the page cannot lose the work. Come back to the same quotation and it is offered straight back with
a note saying how old it is; **Start fresh** (or **Discard and reload saved version** when editing an
existing quotation) throws the recovered copy away.

The local copy is deleted the instant the quotation is saved to the database, and it is only ever on
the machine that typed it — it is a safety net, not a substitute for saving.

### Statuses

| Status | Meaning |
|---|---|
| **Draft** | Still being written. Prints with a DRAFT stamp |
| **Sent** | Issued to the client, waiting on a decision |
| **Accepted** | Won. The quotation locks — to change it, create a revision |
| **Rejected** / **Expired** | Closed. Can be reopened as Sent |
| **Superseded** | A revision replaced it |

### Revisions vs duplicates

- **Create revision** — the client asked for changes to *this* quotation. Keeps the same base number
  with `-R1`, `-R2`, marks the old one Superseded, and both stay linked in the revision history.
  This is what you want when the scope changes mid-negotiation.
- **Duplicate** — a *different* job that looks similar. Gets a brand-new number and no link back.

### Sending it

- **Print view** opens the finished document in a new window — use your browser or the app's Print
  command to save as PDF.
- **PDF** downloads it directly.

The document carries your logo, full statutory details, section-wise subtotals, the GST breakup by rate,
the amount in words, your bank details, terms, and a signature block.

---

## 5. How GST is worked out

**Two tax modes**, chosen per document:

- **Full GST — per line.** Each line has its own HSN/SAC and GST rate. Use this for anything that
  becomes a tax invoice, and whenever the quote mixes rates (18% joinery and 12% carpet, say).
- **Flat rate — whole quote.** One rate across everything. Quick for an informal estimate, but not
  compliant as a tax invoice.

**CGST+SGST or IGST is decided for you.** The app compares your state with the place of supply:

- Same state (Telangana → Telangana) → **CGST + SGST**, split half and half.
- Different state (Telangana → Maharashtra) → **IGST**.

The place of supply comes from the client's state, which is itself taken from the first two digits of
their GSTIN when you enter one. You can override it per document from the **Place of supply** field.

**Rounding.** Totals round to the nearest rupee and the round-off is printed as its own line, so the
document adds up exactly.

**Numbering.** Per line of business, restarting every April with the financial year:

```
ZS/INT/26-27/001     interior quotation
ZS/B2B/26-27/001     procurement quotation
ZS/INV/26-27/001     tax invoice
ZS/PI/26-27/001      proforma
PRJ/INT/26-27/001    project
```

---

## 6. Turning a quote into a project

Open an accepted quotation and choose **Convert to project**. This marks the quotation Accepted and
locked, opens a project in the first stage of that business type's pipeline, carries the contract
value and estimated cost across, and seeds a few starter tasks.

### Stages

Each line of business has its own lanes:

- **Interior:** Design Sign-off → Advance Received → Site Measurement → Production → Delivery →
  Installation → Snagging → Handover → Closed
- **Retail & Commercial Branding:** Brief & Site Survey → Design & Brand Approval → PO Received →
  Fabrication → Site Mobilisation → Installation → Commissioning → Snagging & Handover → Closed
- **B2B:** PO Received → Vendor PO Raised → In Transit → Delivered → Invoiced → Payment Received → Closed

Click any stage in the rail to move the project there. You are asked for an optional note, and the
move is written to the activity log with the date. **Move forward** on the Overview tab advances one
stage.

Edit the lanes in Settings → Lines of business → **Stages**. A stage that projects are currently
sitting in cannot be deleted.

### Working a project

Projects open as **tabs** across the top — several can be open at once, and the strip survives a
restart. The tabs are grouped by line of business.

| Tab | What it holds |
|---|---|
| **Overview** | The facts, the next stage, and the open task list |
| **Tasks** | Title, description, assignee (type a teammate's name), priority, due date, status. Overdue dates turn red. Tasks can carry their own attachments |
| **Money** | Invoices raised against the project, and every expense booked to it |
| **Files** | Drag site photos, screenshots, signed copies and drawings straight in |
| **Activity** | A running log. Stage moves are recorded automatically; add your own notes for site visits, client calls and delays |

---

## 6a. Retail & commercial branding work

Store branding, rebranding, shop-in-shop and outlet fit-outs run as their own line of business, because
almost nothing about them matches a home.

**Quotes are grouped into zones**, not rooms — Facade & Signage, Shopfront, Sales Floor, Back of House,
Site & Project. A new retail quote starts with a Facade & Signage zone.

**The catalog is built around what a store job actually contains**, in eleven categories:

| Category | Covers |
|---|---|
| Signage & Branding | ACP fascia, backlit and front-lit acrylic letters, SS letters, lightboxes, SEG fabric frames, channel letters, neon flex, pylon and wayfinding signage, shutter branding, and dismantling of the old brand |
| Facade & Exterior | ACP and HPL cladding, MS framework, aluminium louvers, canopies, rolling shutters, weatherproofing |
| Shopfront & Glazing | Toughened glazing, structural glazing, automatic entrance doors, frameless partitions |
| Sales Floor & Display | Gondolas, wall shelving, slat wall, display tables, cash counters, trial rooms, mannequin platforms, backlit feature walls, stockroom racking |
| Ceiling · Lighting · Flooring · Wall Finishes | The commercial-grade equivalents of the residential items — different specification, different rate |
| Graphics & Print | Wall graphics, murals, one-way vision, frosted film, floor decals, standees |
| Electrical & Data | Commercial points, DBs, network and CCTV cabling, HVAC grill shifting, detector and sprinkler relocation |
| Site & Project | Survey, design with brand-manual compliance, project management, statutory liaison, **night-shift surcharge**, barricading, access equipment, logistics, debris removal |

Items that exist in both catalogs — false ceiling, painting, flooring, electrical points — are deliberately
kept as **separate rows with commercial specifications and rates**, rather than shared. A retail ceiling is
a grid ceiling on a mall shell at a different rate from a residential gypsum ceiling, and quoting one from
the other would be wrong.

**The default terms are written for this work**, and cover what residential terms do not: brand artwork
sign-off, municipal and mall NOCs excluded, night and restricted-hours working, the store shut-down window
the client must provide in writing, pre-existing facade condition, access equipment, and the limits of an
LED warranty.

---

## 7. Expenses and profitability

Record expenses from a project's **Money** tab: date, category, vendor, amount, how much of it is
GST (for your input credit), whether it is rebillable, and whether it is paid. Attach the bill.

The app keeps **two cost figures apart, and never adds them together**:

| Figure | What it is |
|---|---|
| **Budgeted cost** | The cost prices on the quoted lines — the plan |
| **Spent so far** | Expenses actually booked — the reality |

Adding them would count the same material twice. So the project header shows *budgeted profit* and
how much of the budget you have consumed (turning red if you go over), while the Money tab shows
profit at actuals beside it. Early in a job the budget figure is the meaningful one; by handover the
actuals are.

**Expenses** in the sidebar shows the same records across all projects, filtered by date and
category, with the GST component totalled for your input credit.

---

## 8. Invoices and payments

From a quotation, choose **Raise invoice**:

- **Type** — *Tax invoice* for the real thing, *Proforma* for an advance request.
- **Scope** — *Full quotation* copies every line across, or *Milestone* raises a percentage of the
  quote value as a single line ("40% advance on order confirmation").

It is created as a **Draft** you can review. Set it to **Issued** when it goes out.

**Recording a payment** — open the invoice and use *Record payment*: date, amount, mode (Bank, UPI,
Cash, Cheque, Card) and a reference such as a UTR. The status moves to *Partially paid* or *Paid*
automatically, and the balance flows into the project and the receivables report.

An invoice with payments recorded against it cannot be edited — cancel it and raise a new one, which
is the correct treatment for an issued tax invoice.

---

## 9. Reports

| Report | What it answers |
|---|---|
| **Project P&L** | Per project: revenue, budgeted cost, actual spend, budgeted profit, margin, outstanding. Sortable by line of business |
| **Receivables** | Every unpaid invoice bucketed by age — Current, 1–30, 31–60, 61–90, 90+ days — so you know who to chase |
| **My rate history** | Every item you have quoted, with the min, median, average and max rate you have used, and how many times. Built **only** from your own sent and accepted quotations |

Each exports to CSV for your CA.

The **Dashboard** covers the current financial year: quotes issued and their value, conversion rate,
live pipeline, outstanding money, a monthly invoiced-vs-received-vs-spent chart, pipeline by stage,
and a split by line of business.

---

## 10. Rate card and products

Your master list, one catalog per line of business — Interior Design, Retail & Commercial Branding and
B2B Procurement each have their own tab. Quotations are built by picking from it rather than retyping.

With a few hundred items, use the **category dropdown** beside the search box to narrow to Wardrobe,
Signage & Branding, Beds & Bedroom and so on.

Two categories are worth knowing about because they are easy to forget to quote:

- **Professional** holds the design fee, tiered by home size (2BHK, 3BHK, 4BHK/duplex, villa) plus a
  per-sq.ft option and a charge for revision rounds beyond those included. Full design service in
  this market is billed at roughly 4–5% of project value — the tiers are set to land there, so use
  them in preference to the flat lump-sum line, which is really only for small or single-room jobs.
- **Site Protection & Services** holds floor protection, door and window protection, dust
  barricading, product cleaning and debris removal. These are real costs on every job. Quote them as
  lines rather than absorbing them into overheads — and hold them out of any project discount.

Each item has a name, category, unit, **selling rate**, **cost price**, HSN/SAC, GST rate, and a
specification note that carries into the quotation line. B2B items also have SKU and brand.

Three ways to get items in:

### Typing them
**New item**. Fine for a handful.

### CSV
**Import CSV** — one item per line, columns in this order:

```
name, sku, brand, category, unit, rate, cost, hsn, gst, spec
```

No API key needed.

### PDF or a photo
**Import PDF** reads a rate card PDF, or a photo of a printed one. It transcribes exactly what is
printed — no price is converted or adjusted — and puts every row in a review table. **Nothing is
saved until you press Import.**

It flags what it is unsure about rather than guessing quietly:

- **Items already in your catalog** are matched on name and unit, shown with their current rate, and
  arrive **unticked** — so re-importing an updated rate card updates rates in place instead of
  creating a second copy of everything. Tick one and it becomes a rate update.
- **Units it normalised** (`sft` → Sq.ft, `rft` → R.ft, `LS` → Lump sum) are labelled.
- **Rates it could not read** arrive as 0 with an amber outline instead of being dropped.
- **GST-inclusive rate cards** get a warning, because catalog rates must be GST-*exclusive* — tax is
  added on the quotation.
- **Missing cost prices** are counted, since most rate cards only print selling rates.

There is a box for anything the document does not say — *"rates are per running foot"*, *"ignore the
labour column"*. Needs an API key (Settings → AI).

---

## 11. Market benchmark

Upload competitor quotations — PDF or a photo — as market intelligence. With an API key configured,
each upload gives you a factual summary, how the document is structured, every line item it could
read, pricing patterns, commercial terms, strengths, red flags a client should question, and a
critical appraisal.

**This is walled off from your pricing, by design and by construction:**

1. Competitor records have **no database relationship** to your quotations or rate card.
2. There is **no button anywhere** that copies a competitor line into a quotation or the catalog.
3. The analysis is instructed to describe and critique what the competitor did — never to recommend
   what you should charge.

The only suggestions it makes about your own work are about **document craft**: clarity,
specification depth, exclusions, terms, presentation.

Your own rate benchmarking lives separately, under **Reports → My rate history**.

---

## 12. Settings

| Tab | Contents |
|---|---|
| **Company & documents** | Brand name, legal entity, trademark line, logo, brand colour, GSTIN / CIN / PAN / TAN, registered address, contact details |
| **Bank & terms** | Bank and UPI details, document number prefixes, default quote validity, and the default quotation and invoice terms |
| **Lines of business** | Add, edit and deactivate lines of business; edit each one's pipeline stages |
| **AI & system** | Anthropic API key, PDF engine status, and where your data lives |

### The API key

Needed for the competitor analysis and the PDF rate card import. Get one from
[console.anthropic.com](https://console.anthropic.com) and paste it into **Settings → AI & system**.
It is stored locally with owner-only permissions. Everything else in the app works without it.

---

## 13. Adding a new line of business

**Settings → Lines of business → Add.**

Give it a name, a short code for document numbers (`LND` → `ZS/LND/26-27/001`), and choose whether
its quotations are grouped into sections or are a single flat list. It immediately gets its own
numbering series, pipeline, catalog and default terms. Nothing needs to be rebuilt.

---

## 14. Backing up your data

Everything — database, attachments, logo, settings — lives in one folder.

**In the Mac app:** menu **ZenStudios → Back up data…** writes a dated zip wherever you choose.
**ZenStudios → Reveal data folder** opens the folder itself.

The folder is:

```
~/Library/Application Support/ZenStudios/data/
   app.db          the entire database
   uploads/        attachments and competitor documents
   branding/       your logo
   secrets.json    the API key, if stored through the app
```

Copy that folder and you have copied the business. Restore by putting it back and reopening the app.

---

## 15. Keyboard shortcuts

Available in the Mac app.

| Shortcut | Action |
|---|---|
| ⌘N | New quotation |
| ⇧⌘N | New client |
| ⌘P | Print the current view |
| ⌘1 … ⌘5 | Dashboard, Quotations, Projects, Invoices, Reports |
| ⌘, | Settings |
| ⌘R | Reload |

---

## 16. Troubleshooting

**"Your GSTIN is not set yet"** — Settings → Company & documents. Tax invoices are not valid without it.

**A quotation shows CGST+SGST when it should be IGST** — the client has no state set. Open the client
and add their GSTIN or state, then reopen the quotation. You can also override *Place of supply* on
the quotation itself.

**Margin looks impossibly high** — the cost prices are 0. Fill them in on the rate card, or on the
lines themselves.

**"Accepted quotations cannot be deleted"** — correct, and deliberate. Archive it, or create a
revision if the scope changed.

**The PDF button is missing** — only in the terminal version, when Chromium was never downloaded. Use
**Print view** and save as PDF, or run `npx puppeteer browsers install chrome` in `server/`. The Mac
app is never affected: it renders PDFs with its own engine.

**AI features are greyed out** — no API key. Settings → AI & system.

**The Mac app will not open ("unidentified developer")** — right-click the app → Open → Open. Once only.

**Starting fresh** — `npm run db:reset` wipes everything and reseeds a clean install. There is no undo.

---

## 17. Sharing with your team

Until the app moves to a shared server, each install keeps its own database. Work travels between
machines as a **`.zns` file** — an ordinary text file the app writes and reads, which you hand over
however you like: email, WhatsApp, shared drive, USB stick. Nothing goes through the internet.

There are two kinds, and the app tells them apart on its own.

### Setting up a new team member

**Settings → Share & transfer → Export setup file.**

The file carries your company identity, logo, every line of business with its pipeline stages, and —
if you tick **Include the rate card** — your full catalog with cost prices.

They install ZenStudios, open **Settings → Share & transfer → Open a setup file**, pick it, and their
app is configured exactly like yours. It takes a few seconds.

> **This file contains your GSTIN, CIN, PAN, bank details and your buying prices.** Send it only to
> your own team, and prefer a channel you control. If you only want to pass on the pipeline and
> company details, untick the rate card first.

Applying a setup file is **add-only**. Your company details are overwritten, but any catalog item or
line of business that already exists is left exactly as it is — rates you have corrected are never
reset. So it is safe to re-apply a newer setup file later to pick up items you have added since.

### Sharing a quotation

Open the quotation, then **Share as file**.

You choose whether to include cost prices. It is **off by default**:

| Setting | What the file contains | Send it to |
|---|---|---|
| Off (default) | Description, quantity, rate, GST, totals | Anyone on the team who needs the quotation |
| On | The above plus your buying price on every line | Only people allowed to see margins |

Your colleague opens it from **Quotations → Open a shared file**, or from
**Settings → Share & transfer**.

### What happens when a quotation is opened

The receiving app does not copy your document — it builds a fresh one:

- It is issued a **new quotation number** from *their* series, and starts as a **draft**.
- The client is **matched by name**, or created if they do not have them yet.
- **GST is recalculated** against their own place of supply, so if they are in a different state the
  document correctly becomes IGST instead of CGST + SGST.
- A note is added to the document recording where it came from.
- Your original is untouched.

If cost prices were stripped, the margin column shows **—** rather than a misleading 100% until
someone fills them in.

### Double-clicking a file

The Mac app registers itself as the handler for `.zns`, so double-clicking one in Finder opens
ZenStudios and imports it straight away — a shared quotation opens on screen, a setup file applies
itself and tells you what changed.

### One rule worth agreeing on

Two people who open the same quotation each end up with their **own copy**. There is no merge. Decide
who owns a document before it is shared, and let that person hold the master until the app moves to a
shared server — at which point this whole step disappears.

---

## When your team joins

Today the app runs entirely on your Mac, with one database. When you are ready for the team to work
in the same quotations and projects, the same server this app already runs gets deployed once
centrally, and the Mac app is pointed at it from **ZenStudios → Server…**. The interface and your
data model do not change. What has to be added at that point is user accounts and permissions —
tasks already carry an assignee and notes already carry an author, so that is an addition rather than
a rewrite.
