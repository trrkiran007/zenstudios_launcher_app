import type { CatalogSeed } from './catalog-types.js';

/**
 * Retail & Commercial Branding starter catalog.
 *
 * Covers what a store branding job is actually made of: the facade and signage
 * that carry the brand outside, the shopfront, the sales floor and its fixtures,
 * and the services that make a live-store installation possible.
 *
 * Rates are indicative Hyderabad market figures for supply-and-fix, excluding
 * GST, at roughly a 33-36% margin. Correct them — especially the cost prices —
 * before you quote from them. HSN/SAC codes are the commonly used ones; confirm
 * them with your CA before issuing tax invoices.
 */
export const RETAIL_CATALOG: CatalogSeed[] = [
  /* ------------------------------- signage ------------------------------- */
  { name: 'ACP fascia signage board', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 620, costPrice: 405, hsnSac: '9405', specNote: '4mm ACP on MS framework, brand-matched colour, weatherproofed, excluding letters' },
  { name: 'Acrylic 3D letters — LED backlit (halo)', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 1450, costPrice: 950, hsnSac: '9405', specNote: '19mm acrylic letters, halo-lit rear LED, SMPS driver, standoff mounted. Area measured on letter bounding box' },
  { name: 'Acrylic 3D letters — front-lit', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 1350, costPrice: 880, hsnSac: '9405', specNote: '3mm acrylic face with vinyl, ACP returns, front-lit LED module, SMPS driver' },
  { name: 'Stainless steel letters — non-lit', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 1650, costPrice: 1080, hsnSac: '8310', specNote: '304 grade SS, hairline or mirror finish, 25mm return, standoff mounted' },
  { name: 'Stainless steel letters — backlit', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 2100, costPrice: 1380, hsnSac: '9405', specNote: '304 grade SS face with acrylic rear diffuser, halo LED, standoff mounted' },
  { name: 'Glow sign board — lightbox', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 820, costPrice: 535, hsnSac: '9405', specNote: 'MS box frame, 3mm acrylic face with translucent print, LED module backlighting, driver and wiring' },
  { name: 'Fabric lightbox — SEG frame', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 1150, costPrice: 750, hsnSac: '9405', specNote: 'Aluminium SEG profile, silicone-edge tension fabric graphic, edge-lit LED, tool-free graphic change' },
  { name: 'Channel letter signage — GI', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 1250, costPrice: 815, hsnSac: '9405', specNote: 'GI channel with powder-coated return, acrylic face, LED module, for high-durability external use' },
  { name: 'Neon flex signage', category: 'Signage & Branding', unit: 'R.ft', defaultRate: 780, costPrice: 510, hsnSac: '9405', specNote: 'LED neon flex on acrylic backer, cut to artwork, driver and dimming provision' },
  { name: 'Pylon / totem signage — double sided', category: 'Signage & Branding', unit: 'Nos', defaultRate: 165000, costPrice: 108000, hsnSac: '9405', specNote: 'Up to 10ft, MS structure with ACP cladding, backlit acrylic faces both sides, foundation excluded' },
  { name: 'Directional / wayfinding signage', category: 'Signage & Branding', unit: 'Nos', defaultRate: 4200, costPrice: 2750, hsnSac: '8310', specNote: 'ACP or acrylic panel with printed vinyl, wall or ceiling mounted, brand typography' },
  { name: 'Door vinyl — store timings & branding', category: 'Signage & Branding', unit: 'Nos', defaultRate: 1850, costPrice: 1200, hsnSac: '4911', specNote: 'Cut vinyl or printed decal on entrance glazing, includes application' },
  { name: 'Shutter branding — printed', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 165, costPrice: 108, hsnSac: '4911', specNote: 'Solvent print on vinyl with laminate, applied to rolling shutter, or direct spray-paint artwork' },
  { name: 'Signage dismantling & disposal', category: 'Signage & Branding', unit: 'Sq.ft', defaultRate: 120, costPrice: 78, hsnSac: '9954', specNote: 'Careful removal of existing signage, making good the fixing points, debris disposal. For rebranding jobs' },

  /* --------------------------- facade & exterior ------------------------- */
  { name: 'ACP cladding — facade', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 445, costPrice: 292, hsnSac: '7606', specNote: '4mm ACP, PVDF coated, on MS/aluminium framework, silicone sealed joints' },
  { name: 'ACP cladding — mirror / brushed finish', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 585, costPrice: 385, hsnSac: '7606', specNote: '4mm ACP in mirror or brushed metallic finish, on framework, protective film removed at handover' },
  { name: 'HPL exterior cladding', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 520, costPrice: 340, hsnSac: '3921', specNote: '8mm exterior-grade HPL on aluminium subframe, concealed fixing' },
  { name: 'MS structural framework for facade', category: 'Facade & Exterior', unit: 'Kg', defaultRate: 165, costPrice: 108, hsnSac: '7308', specNote: 'MS box section, welded and ground, two coats red oxide primer, one coat enamel' },
  { name: 'Aluminium louvers — facade screen', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 680, costPrice: 445, hsnSac: '7610', specNote: 'Extruded aluminium louver, powder coated, on aluminium carrier rail' },
  { name: 'Entrance canopy — MS with ACP', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 720, costPrice: 470, hsnSac: '7308', specNote: 'MS frame with ACP soffit and fascia, concealed drainage, LED spot provision' },
  { name: 'Rolling shutter — motorised', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 465, costPrice: 305, hsnSac: '8302', specNote: 'MS or aluminium rolling shutter, tubular motor, remote and manual override' },
  { name: 'Exterior painting — weatherproof', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 52, costPrice: 34, hsnSac: '9954', specNote: 'Surface preparation, exterior primer, two coats weatherproof emulsion' },
  { name: 'Facade waterproofing treatment', category: 'Facade & Exterior', unit: 'Sq.ft', defaultRate: 78, costPrice: 51, hsnSac: '9954', specNote: 'Crack filling, polymer-modified waterproof coating at facade junctions and parapet' },

  /* ------------------------------ shopfront ------------------------------ */
  { name: 'Toughened glass shopfront glazing', category: 'Shopfront & Glazing', unit: 'Sq.ft', defaultRate: 545, costPrice: 356, hsnSac: '7007', specNote: '12mm clear toughened glass, patch fittings, structural silicone, aluminium framing' },
  { name: 'Structural glazing — spider fitting', category: 'Shopfront & Glazing', unit: 'Sq.ft', defaultRate: 785, costPrice: 515, hsnSac: '7007', specNote: '12mm toughened glass on SS spider fittings, MS support structure, weather sealing' },
  { name: 'Automatic sliding entrance door', category: 'Shopfront & Glazing', unit: 'Set', defaultRate: 178000, costPrice: 116000, hsnSac: '8302', specNote: 'Twin-leaf auto slider, 12mm toughened glass, sensor, battery backup, aluminium track' },
  { name: 'Toughened glass door — floor spring', category: 'Shopfront & Glazing', unit: 'Nos', defaultRate: 32000, costPrice: 21000, hsnSac: '7007', specNote: '12mm toughened glass leaf, floor spring, patch fittings, SS pull handle' },
  { name: 'Frameless glass partition', category: 'Shopfront & Glazing', unit: 'Sq.ft', defaultRate: 465, costPrice: 305, hsnSac: '7007', specNote: '10mm toughened glass with U-channel, clear or frosted, for internal zoning' },

  /* -------------------------- sales floor & fixtures --------------------- */
  { name: 'Gondola display unit — double sided', category: 'Sales Floor & Display', unit: 'Nos', defaultRate: 18500, costPrice: 12100, hsnSac: '9403', specNote: 'Per 4ft bay, powder-coated CRCA uprights, adjustable shelves both sides, base deck' },
  { name: 'Wall-mounted display shelving', category: 'Sales Floor & Display', unit: 'R.ft', defaultRate: 2650, costPrice: 1735, hsnSac: '9403', specNote: 'Slotted uprights with adjustable brackets, 19mm prelam or MDF shelf, edge banded' },
  { name: 'Slat wall panelling with inserts', category: 'Sales Floor & Display', unit: 'Sq.ft', defaultRate: 485, costPrice: 318, hsnSac: '9403', specNote: '18mm MDF slat wall, laminate finish, aluminium slot inserts, accessories extra' },
  { name: 'Perforated / pegboard display wall', category: 'Sales Floor & Display', unit: 'Sq.ft', defaultRate: 420, costPrice: 275, hsnSac: '9403', specNote: 'Powder-coated perforated MS or MDF pegboard on battens, hooks charged separately' },
  { name: 'Display table — nesting set', category: 'Sales Floor & Display', unit: 'Set', defaultRate: 26500, costPrice: 17300, hsnSac: '9403', specNote: 'Set of three nesting tables, 19mm BWP ply with laminate, edge banded, levellers' },
  { name: 'Cash counter / POS desk', category: 'Sales Floor & Display', unit: 'R.ft', defaultRate: 8900, costPrice: 5800, hsnSac: '9403', specNote: '19mm BWP ply carcass, laminate or acrylic front, drawer unit, cable management, POS and UPS provision' },
  { name: 'Service / help desk', category: 'Sales Floor & Display', unit: 'R.ft', defaultRate: 7600, costPrice: 4970, hsnSac: '9403', specNote: '19mm ply carcass with laminate finish, brand fascia panel, storage below' },
  { name: 'Trial room — with door and mirror', category: 'Sales Floor & Display', unit: 'Nos', defaultRate: 38500, costPrice: 25200, hsnSac: '9403', specNote: 'Per cubicle: partition, lockable louvered door, full-height mirror, hooks, seat and LED lighting' },
  { name: 'Mannequin display platform', category: 'Sales Floor & Display', unit: 'Nos', defaultRate: 12500, costPrice: 8150, hsnSac: '9403', specNote: 'Raised platform with laminate or carpet finish, concealed LED perimeter, mannequin excluded' },
  { name: 'Brand feature wall — backlit', category: 'Sales Floor & Display', unit: 'Sq.ft', defaultRate: 985, costPrice: 645, hsnSac: '9405', specNote: 'Framed feature wall with translucent print or acrylic, edge-lit LED, brand artwork applied' },
  { name: 'Storage / back-of-house racking', category: 'Sales Floor & Display', unit: 'Nos', defaultRate: 9800, costPrice: 6400, hsnSac: '9403', specNote: 'Per 6ft bay slotted angle racking, five levels, powder coated' },

  /* ------------------------------- ceiling ------------------------------- */
  { name: 'Grid ceiling — mineral fibre', category: 'Ceiling', unit: 'Sq.ft', defaultRate: 135, costPrice: 88, hsnSac: '9954', specNote: '595x595 mineral fibre tile on exposed GI T-grid, perimeter wall angle' },
  { name: 'Gypsum false ceiling — plain', category: 'Ceiling', unit: 'Sq.ft', defaultRate: 118, costPrice: 77, hsnSac: '9954', specNote: '12.5mm gypsum board on GI framing, taped, jointed and finished ready for paint' },
  { name: 'Open ceiling — painted services', category: 'Ceiling', unit: 'Sq.ft', defaultRate: 68, costPrice: 44, hsnSac: '9954', specNote: 'Exposed slab, ducts and conduits cleaned and spray painted, industrial retail look' },
  { name: 'Baffle / linear metal ceiling', category: 'Ceiling', unit: 'Sq.ft', defaultRate: 385, costPrice: 252, hsnSac: '7610', specNote: 'Powder-coated aluminium baffle on carrier system, colour to brand palette' },

  /* ------------------------------- lighting ------------------------------ */
  { name: 'Track light — LED spot', category: 'Lighting', unit: 'Nos', defaultRate: 2450, costPrice: 1600, hsnSac: '9405', specNote: '25-30W COB track spot, 3000K or 4000K, adjustable head, on 3-circuit track' },
  { name: 'Lighting track — 3 circuit', category: 'Lighting', unit: 'R.ft', defaultRate: 620, costPrice: 405, hsnSac: '9405', specNote: 'Surface or suspended 3-circuit track with end caps and feed, black or white' },
  { name: 'Linear profile light — recessed', category: 'Lighting', unit: 'R.ft', defaultRate: 785, costPrice: 512, hsnSac: '9405', specNote: 'Aluminium profile with opal diffuser, continuous run LED, constant-voltage driver' },
  { name: 'LED panel light — recessed', category: 'Lighting', unit: 'Nos', defaultRate: 2250, costPrice: 1470, hsnSac: '9405', specNote: '36W 600x600 recessed panel, 4000K, UGR<19, for grid ceiling' },
  { name: 'Highbay light — warehouse / stockroom', category: 'Lighting', unit: 'Nos', defaultRate: 6800, costPrice: 4450, hsnSac: '9405', specNote: '100-150W LED highbay, suspension kit, for double-height back-of-house' },
  { name: 'Emergency & exit signage light', category: 'Lighting', unit: 'Nos', defaultRate: 2850, costPrice: 1860, hsnSac: '9405', specNote: 'Maintained LED exit sign with 2-hour battery backup, IS compliant pictogram' },

  /* ------------------------------- flooring ------------------------------ */
  { name: 'Vitrified tile flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 165, costPrice: 108, hsnSac: '6907', specNote: '600x600 double-charge vitrified tile, laid on cement mortar, epoxy grouted' },
  { name: 'Vinyl / LVT plank flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 195, costPrice: 128, hsnSac: '3918', specNote: '2-3mm commercial-grade LVT, glue-down on levelled screed, self-levelling compound extra' },
  { name: 'Epoxy floor coating', category: 'Flooring', unit: 'Sq.ft', defaultRate: 128, costPrice: 84, hsnSac: '3907', specNote: 'Self-levelling epoxy, 2mm build, for stockroom and back-of-house' },
  { name: 'Carpet tile flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 175, costPrice: 115, hsnSac: '5703', gstRate: 12, specNote: '500x500 commercial carpet tile, bitumen backing, tackified adhesive' },
  { name: 'Skirting — commercial', category: 'Flooring', unit: 'R.ft', defaultRate: 145, costPrice: 95, hsnSac: '9954', specNote: '100mm skirting in tile, vinyl or powder-coated aluminium, to match flooring' },

  /* ---------------------------- wall finishes ---------------------------- */
  { name: 'Interior wall painting — commercial', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 38, costPrice: 25, hsnSac: '9954', specNote: 'Putty, primer and two coats premium emulsion in brand colour' },
  { name: 'Laminate wall panelling', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 385, costPrice: 252, hsnSac: '4412', specNote: '12mm ply base with 1mm laminate, grooved or flush, on battens' },
  { name: 'WPC / louver wall cladding', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 425, costPrice: 278, hsnSac: '3925', specNote: 'WPC louver panel on ply base, wood or solid finish, concealed fixing' },
  { name: 'Brand wall graphics — printed vinyl', category: 'Graphics & Print', unit: 'Sq.ft', defaultRate: 95, costPrice: 62, hsnSac: '4911', specNote: 'Solvent print on self-adhesive vinyl with matte laminate, applied to prepared surface' },
  { name: 'Wall mural — large format', category: 'Graphics & Print', unit: 'Sq.ft', defaultRate: 135, costPrice: 88, hsnSac: '4911', specNote: 'High-resolution large-format print on textured wallpaper media, seam matched' },
  { name: 'Window graphics — one-way vision', category: 'Graphics & Print', unit: 'Sq.ft', defaultRate: 145, costPrice: 95, hsnSac: '4911', specNote: 'Perforated one-way vision film, printed, applied externally to glazing' },
  { name: 'Frosted / etched film on glass', category: 'Graphics & Print', unit: 'Sq.ft', defaultRate: 115, costPrice: 75, hsnSac: '4911', specNote: 'Frosted film with cut brand artwork, applied to internal face of glazing' },
  { name: 'Floor decal — anti-skid laminate', category: 'Graphics & Print', unit: 'Sq.ft', defaultRate: 165, costPrice: 108, hsnSac: '4911', specNote: 'Printed vinyl with anti-skid laminate for floor application, R10 rated' },
  { name: 'Standee / roll-up banner', category: 'Graphics & Print', unit: 'Nos', defaultRate: 3200, costPrice: 2090, hsnSac: '4911', specNote: '2x5ft aluminium roll-up stand with printed banner and carry bag' },

  /* -------------------------- electrical & data -------------------------- */
  { name: 'Electrical point — commercial', category: 'Electrical & Data', unit: 'Nos', defaultRate: 1150, costPrice: 750, hsnSac: '9954', specNote: 'FR wiring in PVC conduit from DB, modular switch and plate, earthing' },
  { name: 'Distribution board — new', category: 'Electrical & Data', unit: 'Nos', defaultRate: 24500, costPrice: 16000, hsnSac: '8537', specNote: 'TPN DB with MCBs and RCCB, labelled, tested and certified' },
  { name: 'Data / network point', category: 'Electrical & Data', unit: 'Nos', defaultRate: 2350, costPrice: 1530, hsnSac: '8544', specNote: 'Cat6 cable in conduit, I/O box, patch panel termination and testing' },
  { name: 'CCTV camera point — conduiting', category: 'Electrical & Data', unit: 'Nos', defaultRate: 2850, costPrice: 1860, hsnSac: '8544', specNote: 'Conduit, cabling and power provision to camera position. Camera and NVR excluded' },
  { name: 'HVAC grill & duct modification', category: 'Electrical & Data', unit: 'Nos', defaultRate: 6800, costPrice: 4450, hsnSac: '9954', specNote: 'Relocation of supply or return grill with flexible duct, to suit revised ceiling layout' },
  { name: 'Fire detector / sprinkler relocation', category: 'Electrical & Data', unit: 'Nos', defaultRate: 3900, costPrice: 2550, hsnSac: '9954', specNote: 'Shifting existing smoke detector or sprinkler head to suit new ceiling, by licensed agency' },

  /* --------------------------- site & project ---------------------------- */
  { name: 'Site survey & measurement', category: 'Site & Project', unit: 'Lump sum', defaultRate: 12500, costPrice: 4500, hsnSac: '9983', specNote: 'Physical survey, existing condition photographs, dimensioned drawings of facade and interior' },
  { name: 'Design, 3D visualisation & brand compliance', category: 'Site & Project', unit: 'Lump sum', defaultRate: 65000, costPrice: 24000, hsnSac: '9983', specNote: 'Concept, layout, elevations, 3D renders and signage artwork checked against the brand manual. Two revision rounds' },
  { name: 'Project management & site supervision', category: 'Site & Project', unit: 'Lump sum', defaultRate: 75000, costPrice: 30000, hsnSac: '9983', specNote: 'Vendor coordination, site supervision, quality checks, snag closure and handover documentation' },
  { name: 'Statutory liaison & permission support', category: 'Site & Project', unit: 'Lump sum', defaultRate: 38000, costPrice: 15000, hsnSac: '9983', specNote: 'Drawings and coordination for municipal signage permission or mall NOC. Government fees at actuals' },
  { name: 'Night-shift execution surcharge', category: 'Site & Project', unit: 'Day', defaultRate: 9500, costPrice: 6200, hsnSac: '9954', specNote: 'Additional labour and supervision cost for working after store trading hours' },
  { name: 'Site barricading & dust protection', category: 'Site & Project', unit: 'Sq.ft', defaultRate: 65, costPrice: 42, hsnSac: '9954', specNote: 'Printed barricade panel or plastic sheeting, floor protection during a live-store fit-out' },
  { name: 'Access equipment — scaffolding / hydraulic ladder', category: 'Site & Project', unit: 'Day', defaultRate: 6500, costPrice: 4200, hsnSac: '9973', specNote: 'Scaffolding or hydraulic access platform with operator, for facade and high-level signage work' },
  { name: 'Transportation & site logistics', category: 'Site & Project', unit: 'Lump sum', defaultRate: 22000, costPrice: 14300, hsnSac: '9965', specNote: 'Factory-to-site transport of fabricated elements, loading, unloading and shifting to floor' },
  { name: 'Debris removal & final cleaning', category: 'Site & Project', unit: 'Lump sum', defaultRate: 14500, costPrice: 9400, hsnSac: '9994', specNote: 'Removal of construction debris and deep clean of the store ready for merchandising' },
];
