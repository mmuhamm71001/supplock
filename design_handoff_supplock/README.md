# Handoff: Supplock — school supply & equipment management

## How to use this package (start here)
1. Install Claude Code (https://docs.claude.com/en/docs/claude-code) and create an empty folder for the real app.
2. Copy this whole `design_handoff_supplock` folder into it.
3. Open Claude Code in that folder and paste the prompt in **PROMPT.md**.
4. Work through **SETUP.md** (accounts and keys) when Claude Code asks for them.
5. Build in the milestone order in **PROMPT.md**. Test each milestone before moving on.

To see the prototype: open `prototype/index.html` in Chrome. The prototype contains sample data for illustration only. **The real app has no demo data.**

## Overview
Supplock ("Supplies, locked in.") is a multi-school web app. Each school has one or more admins and many teachers. Teachers browse inventory and request supplies, custom items and laptops. Admins approve/deny (stock is deducted on approval only), get low-stock and exceeds-stock alerts, keep a to-do list (shown as a vintage newspaper, "The Supplock Gazette"), place and receive reorders, manage laptops, and review a full transaction log.

## About the design files
The files in `prototype/` are **design references built in HTML** — a working prototype showing intended look and behavior. They are not production code. Recreate them in a real stack (recommended below). All data in the prototype lives in the browser (`localStorage`) via `store.js`; in production it must live in a database with real auth.

**`prototype/store.js` is the functional spec.** Every mutation (approve, deny, receiveReorder, customOrdered, etc.) encodes the business rules exactly. Port its logic to server-side code.

## Fidelity
**High fidelity.** Colors, type, spacing, copy, and interactions are final. Recreate them closely.

## Recommended stack
- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase: Postgres, Auth (email + password, magic link optional), Storage (logos), Row Level Security
- Resend for email notifications
- Styling: Tailwind or CSS modules. Port inline styles faithfully.
- Keep `icons.js` (hand-drawn illustrations, `<sl-icon>`) and `blocks.js` (floating widget, `<sl-block>`) as-is or port to React components. They are self-contained and have no dependencies.

---

## Roles & permissions
| | Teacher | Admin |
|---|---|---|
| View inventory (name, icon, status only; **no cost/vendor**) | ✓ | ✓ (full detail) |
| Submit supply / custom / laptop requests | ✓ | – |
| See own requests & notifications | ✓ | – |
| Approve / deny / edit requests | – | ✓ |
| Inventory CRUD, adjustments, reorders | – | ✓ |
| Laptops, to-do, Gazette, transaction log | – | ✓ |
| School settings (name, logo, code), user management | – | ✓ |

Every row in every table belongs to a `school_id`. Users can only read/write rows from their own school (enforce with Supabase RLS).

## Multi-school & school codes
- **Register school** (Login page, "Register school" tab): school name, admin name, admin email, optional logo. Creates the school, makes the user its admin, and shows a generated **school code** (format `WORD-NNNN`: the first 5 letters of the school name in uppercase, a dash, then 4 random digits, e.g. `MAPLE-4821`). It must be unique. Starts with an empty inventory plus two to-dos: "Add your supplies to the inventory" and "Share the school code XXX with your teachers".
- **Join as teacher**: school code + name + email + optional classroom. Once the code matches, the card shows the school's logo and name ("Joining …").
- **Sign in**: school code + email + password. Remember the last school code on the device. The card shows that school's logo and name.
- **Admin dashboard** shows the code with a Copy button, and Upload/Change/Remove logo.
- Logo: optional image, resized to max 240px, stored in Supabase Storage. Shown on the sign-in card, the teacher header, the admin header, and the dashboard. Fallback: a purple rounded square with the school's first letter.
- Production additions: let admins regenerate the code; let admins invite other admins; optional email-domain restriction per school.

## Data model (Postgres)
```
schools(id, name, code unique, logo_url, created_at)
profiles(id = auth.users.id, school_id, name, email, role 'admin'|'teacher', room)
items(id, school_id, name, category, unit, qty int >= 0, low_threshold int, vendor, url,
      pack_name, pack_size int default 1, price numeric, icon text null)
laptops(id, school_id, tag 'LT-001', status 'available'|'out'|'assigned', zoom bool,
        holder_id null, room, due_date null)
requests(id, school_id, teacher_id, kind 'supply'|'custom'|'laptop', status
        'pending'|'approved'|'denied'|'ordered'|'delivered', qty, room, note, created_at,
        item_id null,                         -- supply
        name, url, needed_by, eta,            -- custom
        laptop_type 'temp'|'full', from_date, to_date, laptop_tags text[])  -- laptop
reorders(id, school_id, item_id, packs, placed_on, eta, status 'ordered'|'received',
        received_packs, received_on)
todos(id, school_id, text, done, auto bool, item_id null, request_id null, link, due)
log(id, school_id, ts, action, teacher_name, item_label, qty text, room, result)
notifications(id, school_id, to_user_id null, to_role 'admin' null, kind
        'request'|'urgent'|'low'|'status', text, read bool, ts)
```

## Business rules (must match store.js)
- **Stock** is always counted in the item's base unit. `pack_size` = units per purchase (1 box = 10 reams). Items sold individually use 1.
- **Level**: out = 0; critical ≤ floor(threshold/3); low < threshold; else OK. Colors: OK teal #4d7b93, low orchid #b45dbb, critical/out berry #8c1c45.
- **Suggested reorder**: packs = max(1, ceil((threshold×2 − qty) / pack_size)), text "Order N boxes = M reams".
- **Submitting a request never changes stock.** It logs a "Requested" event and notifies the admin. If qty > available: also send an urgent notification "⚠️ Request from [Teacher] exceeds current stock for [Item]" and auto-add the to-do "Order more [Item]". It is **not** blocked.
- **Approve (supply)**: stock = max(0, qty − requested) (never negative). Log "Approved" and "Deducted" (with the resulting stock). If the new level isn't OK: send a low-stock notification with the suggested reorder, and auto-add "Order more [Item]" (no duplicates of an open one). Notify the teacher.
- **Deny**: inventory untouched. Log "Denied", close linked to-dos, notify the teacher.
- Admin can edit qty before approving.
- **Custom requests**: if a product link is given, auto-add the to-do "Order [name]" with the link and needed-by date. Flow: Pending → Approved (Pending Order) → Ordered (admin enters ETA, teacher is notified "Your request for X has been ordered — expected to arrive [date].") → Delivered (teacher is notified that it's ready for pickup).
- **Laptops**: Temporary checkout (date range, qty) or Full-time class use (qty 1, **classroom required**). Approve assigns available laptops by tag: temp → status out with a due date; full → status assigned to the classroom. "Returned" resets to available. Each return is logged.
- **Reorders**: "Mark ordered" creates a reorder (default ETA +5 days). "Received" adds received_packs × pack_size to stock (the packs count is editable for partial deliveries). If the level is now OK, close the "Order more" to-do.
- **Retail checkout is manual.** Show a pre-filled shopping list grouped by vendor, with saved links, pack sizes and estimated cost.
- **Transaction log** records every inventory-affecting event: requested, approved, denied, deducted, adjustment, item added/removed, reorder placed, received, laptop checkout/assigned/return. Filters: teacher, item search, date range, action type. Sorted newest first.

## Spaces: classroom & subject inventories
Each **space** is a room whose contents are tracked separately from the main supply closet. It has **exactly one owner** (a teacher), and a teacher can own several spaces.
- Every teacher automatically gets a **classroom space** ("Classroom · Rm 108") when they join.
- Admins create **subject spaces** (Science Lab, Gym, Art Room, Music Room…), with an optional subject label, and assign or reassign the owner. Admins can also create extra classroom spaces and delete spaces (this also deletes their items and counts; ask for confirmation).
- **Item fields**: name, category (Supplies | Equipment | Books | Furniture), qty, unit, low-alert threshold (0 = no alert), "on loan from the main closet" flag, note, and an optional icon (auto-matched from the name).
- **Who can edit**: the owner and every admin can add, edit, remove and adjust items and take counts. Other teachers cannot see the space.
- **Keeping counts current**: a −/+ stepper on each row. Every change is logged as "Space adjustment".
- **Taking inventory (periodic count)**: "Take inventory" switches every row to a count field prefilled with the record, showing the live difference. "Save count" sets every qty to the counted value and stores a count record `{space_id, ts, by, lines:[{item_id, name, unit, expected, counted, prev}]}`, where `prev` is the value from the previous count. The history lists counts newest first; expanding one shows what changed since the previous count (or against the record, for the first count). Logged as "Space count" with the number corrected.
- **Low alerts**: when an item's qty drops below its threshold, notify **both the owner and the admins** ("Safety goggles in Science Lab are low (22 left, low at 24)"). Don't send a duplicate while an identical unread alert exists.
- **Placement prompt**: when a teacher's supply or laptop request is approved, or a custom request is delivered, set `placement = 'pending'`. The teacher sees a "Where should these go?" card listing each pending item with a space picker (their spaces), an "On loan" checkbox (ticked by default for laptops), **Add** and **Don't add**. Add merges the quantity into an existing item with the same name and loan flag, or creates a new one. It is logged as "Placed in space".
- **Teacher UI**: a third tab, **My spaces**, with a pill per space showing its low count, then the space inventory panel.
- **Admin UI**: a new **Spaces** page in the admin nav. The left column has a filter (All / Subject / Classrooms), the space cards (owner, item count, low count, last counted date; the selected card shows an owner dropdown and Delete) and a New space form. The right column shows the same inventory panel as the teacher's, in admin mode.

Additional tables:
```
spaces(id, school_id, name, kind 'classroom'|'subject', subject, owner_id)
space_items(id, school_id, space_id, name, category, qty int >= 0, unit, low_threshold int default 0,
            on_loan bool, note, icon)
space_counts(id, school_id, space_id, counted_at, counted_by, lines jsonb)
requests: + placement 'pending'|'done'|'skipped' null, + placed_in_space_id null
```
RLS: teachers can read and write rows of spaces they own. Admins can read and write all spaces in their school.
New log actions: Space created, Space item, Space adjustment, Space count, Placed in space.

## Excel export
"Export to Excel" downloads a real .xlsx file (the prototype uses SheetJS; in production use SheetJS or exceljs, server-side or client-side). The file is named `[School]-[what]-[YYYY-MM-DD].xlsx` and the column widths fit the content.
- **Space panel** (teacher owner + admin): sheets "Items" (Item, Category, Quantity, Unit, Low alert at, Status, On loan from main closet, Note) and "Count history" (Date, Counted by, Item, On record, Counted, Difference, Previous count).
- **Admin Spaces page → Export all spaces**: "Summary" (one row per space: owner, item count, total units, low, on loan, last counted), "All items" (every item with its Space / Type / Owner columns), plus one sheet per space.
- **Admin Inventory (main closet)**: "Inventory" (including vendor, price, stock value and link) and "Orders". Teachers never get cost or vendor columns.
See `exportXlsx`, `spaceRows`, `countRows`, `allSpaceRows`, `spaceSummaryRows`, `closetRows` and `orderRows` in `prototype/store.js`.

## Notifications
In-app bell (unread count) + email via Resend:
- Admin: new request; exceeds stock (urgent, red banner on the dashboard); low stock.
- Teacher: approved, denied, custom ordered (with ETA), delivered.

## Screens (see prototype files)
| Screen | File | Notes |
|---|---|---|
| Landing | Supplock Landing.dc.html | Off-center headline, dashboard mockup, tilted floating interactive widgets, hand-drawn notes |
| Sign in / Join / Register school | Supplock Login.dc.html | Centered card, school logo, 4–6 decorative floating blocks |
| Teacher home | Supplock Teacher.dc.html | Inventory list with big Request buttons, request popup, custom + laptop forms, My requests with custom-status progress, confirmation with floating check |
| Admin dashboard | Supplock Admin.dc.html | School code strip, approval queue (flat), custom orders, mini Gazette to-do card, stock bars, laptop summary |
| Inventory | Supplock Inventory.dc.html | Stat blocks (filter), flat table, side panel form with icon picker (auto-suggest), shopping list, orders |
| Laptops | Supplock Laptops.dc.html | Status-colored tiles LT-001…, Zoom badge + switch, donut, assigned/out lists |
| Gazette (to-do) | Supplock Gazette.dc.html | Vintage newspaper: masthead, EXTRA banner when urgent, WANTED poster lead, to-do, Stop the Presses, Deliveries, Laptop Report, Pending (rubber stamps), Classifieds, Latest Wire |
| Transaction log | Supplock Log.dc.html | Filterable flat table |
| Spaces (admin) | Supplock Spaces.dc.html | Space list, new space, owner assignment, inventory panel |
| Space inventory panel | SpaceInventory.dc.html | Shared by teacher "My spaces" and admin Spaces: stepper, add/edit, take inventory, count history |
| 404 / error | Supplock Not Found.dc.html | `?error` shows the error variant |

## Design tokens
**Colors**: ink/aubergine #2e0f38 · navy #1a2c54 · purple #8351a8 (edge #5e3680) · slate teal #4d7b93 (edge #335a6e) · orchid #b45dbb (highlights/stamps; block fill #bf6cc6 with ink text) · berry #8c1c45 (critical only) · bg #f6f1f8 · tints #e6dbef #f1dff3 #dce8ee #dde2ee #efe7f3 · muted text #5c4766 / #3d2547 · Gazette paper #efe6d6 / #f4ebda. No orange, yellow, green or gradients.
**Type**: Young Serif (headlines) · DM Sans (UI/body) · JetBrains Mono (counts, IDs, codes) · Caveat (handwritten notes) · Gazette: Anton (masthead/stamps), Old Standard TT (body), Playfair Display 900 (subheads).
**Radii**: cards 22–28px, buttons 14–18px, floating blocks 20–40px. Gazette is square.
**Shadows**: extruded edge `0 5px 0 <edge>`. Floating block `0 8px 0 edge, 0 18px 30px rgba(46,15,56,.2), 0 4px 8px rgba(46,15,56,.12)`.
**Motion**: floats ±8px over 6–9s, hover lift −8px and straighten (.25s cubic-bezier(.3,1.4,.5,1)). Respect prefers-reduced-motion.
**Accessibility**: AA contrast, 44px minimum tap targets, visible focus ring `3px solid #b45dbb`.

## Assets
- `icons.js`: original vector illustrations (18 items + shelf). Simple version below 96px, detailed version at 96px and up; the `tint` attribute gives the Gazette print look. Item→icon auto-match lives in `SLIcons.suggest(name)`.
- `blocks.js`: `<sl-block color tilt float deco radius settle mhide nofloat>`.
- Google Fonts listed above. No photos are used.

## Files
`prototype/` contains every page plus `store.js` (logic/spec), `icons.js`, `blocks.js` and `support.js` (the prototype runtime only; not needed in production).
