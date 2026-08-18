import type { CatalogSeed } from './catalog-types.js';

/**
 * Residential Interior starter catalog.
 *
 * Configurations are separate rows rather than options on one row, because a
 * quotation line is what the client actually reads: "Wardrobe — sliding,
 * profile shutter with fluted glass" prints correctly and carries its own rate,
 * cost and specification. Searching "wardrobe" in the picker brings up every
 * variant together.
 *
 * Rates are indicative Hyderabad market figures for supply-and-fix, excluding
 * GST, at roughly a 33-36% margin. Correct them — especially the cost prices —
 * before you quote from them. Carcass is 19mm BWP ply throughout unless the
 * specification says otherwise.
 */
export const RESIDENTIAL_CATALOG: CatalogSeed[] = [
  /* --------------------------- modular kitchen --------------------------- */
  { name: 'Base unit — kitchen', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1750, costPrice: 1150, hsnSac: '9403', specNote: '19mm BWP ply carcass, 0.8mm laminate shutter, Hettich soft-close hinges' },
  { name: 'Base unit — kitchen, membrane shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1950, costPrice: 1270, hsnSac: '9403', specNote: '19mm BWP ply carcass, 18mm MDF membrane-pressed shutter, seamless edges, soft-close hinges' },
  { name: 'Base unit — kitchen, acrylic shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2450, costPrice: 1595, hsnSac: '9403', specNote: '19mm BWP ply carcass, high-gloss acrylic shutter with matching edge band, soft-close hinges' },
  { name: 'Base unit — kitchen, PU shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2650, costPrice: 1725, hsnSac: '9403', specNote: '19mm BWP ply carcass, MDF shutter in PU matte or gloss finish, custom shade, soft-close hinges' },
  { name: 'Base unit — kitchen, veneer shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2850, costPrice: 1855, hsnSac: '9403', specNote: '19mm BWP ply carcass, natural veneer shutter with PU top coat, grain matched across the run' },
  { name: 'Wall unit — kitchen', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1550, costPrice: 1000, hsnSac: '9403', specNote: '19mm BWP ply carcass, 0.8mm laminate shutter, Hettich lift-up fittings' },
  { name: 'Wall unit — kitchen, membrane shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1750, costPrice: 1140, hsnSac: '9403', specNote: '19mm BWP ply carcass, membrane-pressed shutter, lift-up or hinged fittings' },
  { name: 'Wall unit — kitchen, acrylic shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2250, costPrice: 1465, hsnSac: '9403', specNote: '19mm BWP ply carcass, high-gloss acrylic shutter, Hettich lift-up fittings' },
  { name: 'Wall unit — kitchen, PU shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2450, costPrice: 1595, hsnSac: '9403', specNote: '19mm BWP ply carcass, MDF shutter in PU finish, Hettich lift-up fittings' },
  { name: 'Wall unit — kitchen, profile shutter with plain glass', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2550, costPrice: 1660, hsnSac: '9403', specNote: 'Aluminium profile frame with 5mm clear glass insert, soft-close hinges, interior LED provision' },
  { name: 'Wall unit — kitchen, profile shutter with frosted glass', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2600, costPrice: 1690, hsnSac: '9403', specNote: 'Aluminium profile frame with 5mm frosted glass insert, soft-close hinges' },
  { name: 'Wall unit — kitchen, profile shutter with fluted glass', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2850, costPrice: 1855, hsnSac: '9403', specNote: 'Aluminium profile frame with fluted / reeded glass insert, soft-close hinges, interior LED provision' },
  { name: 'Tall unit — kitchen', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1900, costPrice: 1250, hsnSac: '9403', specNote: '19mm BWP ply, laminate shutter, pull-out pantry, Hettich channels' },
  { name: 'Tall unit — kitchen, acrylic shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2600, costPrice: 1690, hsnSac: '9403', specNote: '19mm BWP ply, high-gloss acrylic shutter, pull-out pantry, Hettich channels' },
  { name: 'Tall unit — kitchen, PU shutter', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2800, costPrice: 1820, hsnSac: '9403', specNote: '19mm BWP ply, MDF shutter in PU finish, pull-out pantry, Hettich channels' },
  { name: 'Breakfast counter / island', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 2350, costPrice: 1530, hsnSac: '9403', specNote: '19mm BWP ply carcass with laminate or acrylic finish, storage both sides, counter charged separately' },
  { name: 'Quartz counter top', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 850, costPrice: 560, hsnSac: '6810', specNote: '20mm quartz, mitred edge, 100mm skirting' },
  { name: 'Granite counter top', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 520, costPrice: 340, hsnSac: '6802', specNote: '18mm granite, machine polished, half-round edge, 100mm skirting' },
  { name: 'Corian / solid surface counter top', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 1650, costPrice: 1075, hsnSac: '3918', specNote: '12mm solid surface with seamless joints, integrated sink option, coved skirting' },
  { name: 'Kitchen backsplash — tile', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 195, costPrice: 127, hsnSac: '6907', specNote: 'Glazed or subway tile with epoxy grout, laid over prepared wall' },
  { name: 'Kitchen backsplash — lacquered glass', category: 'Modular Kitchen', unit: 'Sq.ft', defaultRate: 465, costPrice: 302, hsnSac: '7005', specNote: '6mm back-painted toughened glass, cut-outs for sockets, silicone fixed' },

  /* -------------------------- kitchen accessories ------------------------ */
  { name: 'Cutlery tray insert', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 3800, costPrice: 2470, hsnSac: '8302', specNote: 'SS or plastic cutlery organiser sized to the drawer, Hettich or Ebco' },
  { name: 'Bottle pull-out', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 6500, costPrice: 4225, hsnSac: '8302', specNote: '150-200mm SS bottle pull-out with soft-close runners' },
  { name: 'Corner unit — magic corner', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 24500, costPrice: 15900, hsnSac: '8302', specNote: 'Pull-out magic corner mechanism with four wire baskets, soft close' },
  { name: 'Corner unit — Lemans', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 32000, costPrice: 20800, hsnSac: '8302', specNote: 'Twin-tray Lemans swing-out corner unit, soft close' },
  { name: 'Tandem drawer set', category: 'Kitchen Accessories', unit: 'Set', defaultRate: 12500, costPrice: 8125, hsnSac: '8302', specNote: 'Three-drawer tandem box set with soft-close full-extension runners' },
  { name: 'Tall pantry pull-out', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 38000, costPrice: 24700, hsnSac: '8302', specNote: 'Six-shelf tall pull-out unit with soft-close runners, 300-450mm width' },
  { name: 'Wicker / mesh basket', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 4200, costPrice: 2730, hsnSac: '8302', specNote: 'Pull-out wicker or SS mesh basket on telescopic channels' },
  { name: 'Roller shutter unit', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 14500, costPrice: 9425, hsnSac: '8302', specNote: 'Aluminium roller shutter for the appliance garage, soft-close mechanism' },
  { name: 'Waste bin — pull-out', category: 'Kitchen Accessories', unit: 'Nos', defaultRate: 5800, costPrice: 3770, hsnSac: '8302', specNote: 'Twin-compartment pull-out waste bin on soft-close runners' },
  { name: 'Under-cabinet LED profile light', category: 'Kitchen Accessories', unit: 'R.ft', defaultRate: 385, costPrice: 250, hsnSac: '9405', specNote: 'Aluminium profile with diffuser, warm white LED strip, driver and switching' },

  /* ------------------------------- wardrobe ------------------------------ */
  { name: 'Wardrobe — hinged', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1650, costPrice: 1080, hsnSac: '9403', specNote: '19mm BWP ply, laminate shutters, Hettich soft-close hinges, internal drawers' },
  { name: 'Wardrobe — hinged, membrane shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: '19mm BWP ply, membrane-pressed MDF shutter, seamless edges, soft-close hinges' },
  { name: 'Wardrobe — hinged, acrylic shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2350, costPrice: 1530, hsnSac: '9403', specNote: '19mm BWP ply, high-gloss acrylic shutter with matching edge band, soft-close hinges' },
  { name: 'Wardrobe — hinged, PU shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2550, costPrice: 1660, hsnSac: '9403', specNote: '19mm BWP ply, MDF shutter in PU matte or gloss, custom shade, soft-close hinges' },
  { name: 'Wardrobe — hinged, veneer shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2750, costPrice: 1790, hsnSac: '9403', specNote: '19mm BWP ply, natural veneer shutter with PU top coat, grain matched' },
  { name: 'Wardrobe — hinged, mirror shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2150, costPrice: 1400, hsnSac: '9403', specNote: '19mm BWP ply, 5mm bevelled mirror on shutter with safety backing film' },
  { name: 'Wardrobe — hinged, lacquered glass shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2450, costPrice: 1595, hsnSac: '9403', specNote: '19mm BWP ply, 5mm back-painted lacquered glass shutter, aluminium edge trim' },
  { name: 'Wardrobe — hinged, profile shutter with plain glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2550, costPrice: 1660, hsnSac: '9403', specNote: 'Aluminium profile frame with 5mm clear glass insert, soft-close hinges' },
  { name: 'Wardrobe — hinged, profile shutter with tinted glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2650, costPrice: 1725, hsnSac: '9403', specNote: 'Aluminium profile frame with 5mm tinted glass (grey, bronze or black), soft-close hinges' },
  { name: 'Wardrobe — hinged, profile shutter with fluted glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2850, costPrice: 1855, hsnSac: '9403', specNote: 'Aluminium profile frame with fluted / reeded glass insert, soft-close hinges' },
  { name: 'Wardrobe — hinged, profile shutter with frosted glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2600, costPrice: 1690, hsnSac: '9403', specNote: 'Aluminium profile frame with 5mm frosted glass insert, soft-close hinges' },
  { name: 'Wardrobe — sliding', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1950, costPrice: 1300, hsnSac: '9403', specNote: '19mm BWP ply, laminate sliding shutter, Hettich Topline track' },
  { name: 'Wardrobe — sliding, acrylic shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2650, costPrice: 1725, hsnSac: '9403', specNote: '19mm BWP ply, high-gloss acrylic sliding shutter, Hettich Topline track' },
  { name: 'Wardrobe — sliding, PU shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2850, costPrice: 1855, hsnSac: '9403', specNote: '19mm BWP ply, MDF sliding shutter in PU finish, Hettich Topline track' },
  { name: 'Wardrobe — sliding, veneer shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 3050, costPrice: 1985, hsnSac: '9403', specNote: '19mm BWP ply, veneer sliding shutter with PU top coat, Hettich Topline track' },
  { name: 'Wardrobe — sliding, mirror shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2450, costPrice: 1595, hsnSac: '9403', specNote: '19mm BWP ply, mirror sliding shutter with safety backing film, soft-close track' },
  { name: 'Wardrobe — sliding, lacquered glass shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2750, costPrice: 1790, hsnSac: '9403', specNote: '19mm BWP ply, back-painted lacquered glass sliding shutter, aluminium frame' },
  { name: 'Wardrobe — sliding, profile shutter with plain glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2850, costPrice: 1855, hsnSac: '9403', specNote: 'Aluminium profile sliding frame with 5mm clear glass, soft-close track' },
  { name: 'Wardrobe — sliding, profile shutter with tinted glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 2950, costPrice: 1920, hsnSac: '9403', specNote: 'Aluminium profile sliding frame with 5mm tinted glass (grey, bronze or black), soft-close track' },
  { name: 'Wardrobe — sliding, profile shutter with fluted glass', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 3150, costPrice: 2050, hsnSac: '9403', specNote: 'Aluminium profile sliding frame with fluted / reeded glass, soft-close track' },
  { name: 'Walk-in wardrobe — open unit', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: '19mm BWP ply open module with hanging, shelving and drawer bays, no shutters' },
  { name: 'Loft storage', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1250, costPrice: 800, hsnSac: '9403', specNote: '19mm BWP ply carcass with laminate shutters' },
  { name: 'Loft storage — acrylic shutter', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1750, costPrice: 1140, hsnSac: '9403', specNote: '19mm BWP ply carcass with high-gloss acrylic shutters to match the wardrobe below' },
  { name: 'Dresser unit with mirror', category: 'Wardrobe', unit: 'Sq.ft', defaultRate: 1950, costPrice: 1270, hsnSac: '9403', specNote: '19mm BWP ply, drawer storage, bevelled mirror panel, laminate or PU finish' },

  /* ------------------- wardrobe internals & lighting --------------------- */
  { name: 'Wardrobe internal drawer set', category: 'Wardrobe Internals & Lighting', unit: 'Set', defaultRate: 9800, costPrice: 6370, hsnSac: '8302', specNote: 'Three internal drawers with soft-close full-extension runners, laminate finish' },
  { name: 'Hanging rod with mounts', category: 'Wardrobe Internals & Lighting', unit: 'R.ft', defaultRate: 450, costPrice: 292, hsnSac: '8302', specNote: 'Anodised aluminium or SS oval rod with end mounts and centre support' },
  { name: 'Pull-down hanger rail', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 8500, costPrice: 5525, hsnSac: '8302', specNote: 'Wardrobe lift / pull-down hanging rail for loft-height hanging, soft-return' },
  { name: 'Trouser rack — pull-out', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 5200, costPrice: 3380, hsnSac: '8302', specNote: 'Pull-out trouser rack on telescopic channels, chrome or matte black' },
  { name: 'Tie & belt organiser', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 3400, costPrice: 2210, hsnSac: '8302', specNote: 'Pull-out tie and belt rack with soft-close runner' },
  { name: 'Pull-out mirror unit', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 7800, costPrice: 5070, hsnSac: '8302', specNote: 'Full-length pull-out and swivel mirror on telescopic mechanism' },
  { name: 'Wardrobe safe / locker provision', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 6500, costPrice: 4225, hsnSac: '9403', specNote: 'Concealed compartment with ply enclosure and electrical point for a safe. Safe not included' },
  { name: 'Wardrobe LED profile light — shutter mounted', category: 'Wardrobe Internals & Lighting', unit: 'R.ft', defaultRate: 420, costPrice: 273, hsnSac: '9405', specNote: 'Aluminium profile with diffuser on the shutter edge or shelf, warm white LED, driver included' },
  { name: 'Wardrobe sensor strip light', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 2650, costPrice: 1720, hsnSac: '9405', specNote: 'Door-activated PIR sensor LED strip, switches on when the shutter opens, per bay' },
  { name: 'Wardrobe interior spot light', category: 'Wardrobe Internals & Lighting', unit: 'Nos', defaultRate: 1350, costPrice: 878, hsnSac: '9405', specNote: 'Recessed mini LED spot inside the wardrobe with driver and wiring' },
  { name: 'Wardrobe hanging rod light', category: 'Wardrobe Internals & Lighting', unit: 'R.ft', defaultRate: 680, costPrice: 442, hsnSac: '9405', specNote: 'Illuminated aluminium hanging rod with integrated LED and sensor switching' },

  /* ---------------------------- beds & bedroom --------------------------- */
  { name: 'Bed with storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 42000, costPrice: 27500, hsnSac: '9403', specNote: 'Queen size, hydraulic storage, upholstered headboard' },
  { name: 'King bed — hydraulic storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 58000, costPrice: 37700, hsnSac: '9403', specNote: '72x78in, 19mm BWP ply, hydraulic lift-up storage, upholstered headboard, laminate or veneer finish' },
  { name: 'King bed — drawer storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 52000, costPrice: 33800, hsnSac: '9403', specNote: '72x78in, 19mm BWP ply, four side drawers on soft-close runners, upholstered headboard' },
  { name: 'King bed — without storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 44000, costPrice: 28600, hsnSac: '9403', specNote: '72x78in platform bed, 19mm BWP ply, upholstered or panelled headboard' },
  { name: 'Queen bed — hydraulic storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 48000, costPrice: 31200, hsnSac: '9403', specNote: '60x78in, 19mm BWP ply, hydraulic lift-up storage, upholstered headboard' },
  { name: 'Queen bed — drawer storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 43000, costPrice: 27950, hsnSac: '9403', specNote: '60x78in, 19mm BWP ply, side drawers on soft-close runners, upholstered headboard' },
  { name: 'Queen bed — without storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 36000, costPrice: 23400, hsnSac: '9403', specNote: '60x78in platform bed, 19mm BWP ply, upholstered or panelled headboard' },
  { name: 'Single / twin bed — with storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 28000, costPrice: 18200, hsnSac: '9403', specNote: '36x75in, 19mm BWP ply, drawer or lift-up storage, laminate finish' },
  { name: 'Single / twin bed — without storage', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 22000, costPrice: 14300, hsnSac: '9403', specNote: '36x75in platform bed, 19mm BWP ply, laminate finish' },
  { name: 'Bunk bed — twin over twin', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 62000, costPrice: 40300, hsnSac: '9403', specNote: 'Two 36x75in berths, 19mm BWP ply, ladder, safety guard rail, laminate finish' },
  { name: 'Bunk bed with study desk below', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 78000, costPrice: 50700, hsnSac: '9403', specNote: 'Loft berth over an integrated study desk with overhead shelf, ladder and guard rail, cable grommet' },
  { name: 'Bunk bed with storage staircase', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 92000, costPrice: 59800, hsnSac: '9403', specNote: 'Twin over twin with a stepped staircase of drawers instead of a ladder, guard rail, laminate finish' },
  { name: 'Bunk bed with wardrobe below', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 96000, costPrice: 62400, hsnSac: '9403', specNote: 'Loft berth over a two-shutter wardrobe with hanging and shelving, ladder and guard rail' },
  { name: 'Trundle bed — pull-out', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 46000, costPrice: 29900, hsnSac: '9403', specNote: 'Single bed with a pull-out lower berth on castors, 19mm BWP ply, laminate finish' },
  { name: 'Sofa-cum-bed unit', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 52000, costPrice: 33800, hsnSac: '9401', specNote: 'Fold-out mechanism, ply frame, foam and fabric upholstery, storage below' },
  { name: 'Upholstered headboard', category: 'Beds & Bedroom', unit: 'Sq.ft', defaultRate: 1450, costPrice: 945, hsnSac: '9403', specNote: 'Ply base with foam and fabric or leatherette upholstery, tufted or channelled as specified' },
  { name: 'Bed back wall panelling', category: 'Beds & Bedroom', unit: 'Sq.ft', defaultRate: 1250, costPrice: 815, hsnSac: '9403', specNote: 'Ply base with laminate, veneer, fluted or upholstered finish, concealed LED provision' },
  { name: 'Bedside table', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 9500, costPrice: 6175, hsnSac: '9403', specNote: '19mm BWP ply, two soft-close drawers, laminate or veneer finish' },
  { name: 'Study / work table', category: 'Beds & Bedroom', unit: 'Sq.ft', defaultRate: 1600, costPrice: 1040, hsnSac: '9403', specNote: '19mm BWP ply, laminate finish, cable grommet' },
  { name: 'Kids study unit with overhead storage', category: 'Beds & Bedroom', unit: 'Sq.ft', defaultRate: 1750, costPrice: 1140, hsnSac: '9403', specNote: '19mm BWP ply desk with overhead shelving and pinboard, rounded edges, laminate finish' },
  { name: 'Ottoman / storage bench', category: 'Beds & Bedroom', unit: 'Nos', defaultRate: 14500, costPrice: 9425, hsnSac: '9401', specNote: 'Ply carcass with lift-up upholstered top, foam and fabric as specified' },

  /* ---------------------------- living & dining -------------------------- */
  { name: 'TV unit with panelling', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: '19mm BWP ply, veneer or laminate finish, concealed cable management' },
  { name: 'TV unit — floating with drawers', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1950, costPrice: 1270, hsnSac: '9403', specNote: 'Wall-hung 19mm BWP ply unit with soft-close drawers, concealed brackets, cable management' },
  { name: 'TV unit — full wall with storage', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 2150, costPrice: 1400, hsnSac: '9403', specNote: 'Floor-to-ceiling unit with closed storage, open display niches and concealed LED' },
  { name: 'Crockery / bar unit', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1900, costPrice: 1240, hsnSac: '9403', specNote: '19mm BWP ply, glass shutters, profile lighting' },
  { name: 'Crockery unit — profile shutter with fluted glass', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 2650, costPrice: 1725, hsnSac: '9403', specNote: 'Aluminium profile frame with fluted glass, internal LED profile, soft-close hinges' },
  { name: 'Sideboard / buffet unit', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: '19mm BWP ply with laminate or veneer, soft-close shutters and drawers' },
  { name: 'Bookshelf / display unit', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1650, costPrice: 1075, hsnSac: '9403', specNote: '19mm BWP ply open shelving with laminate finish, adjustable shelf option' },
  { name: 'Shoe rack unit', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1550, costPrice: 1010, hsnSac: '9403', specNote: '19mm BWP ply with tilt-out or shutter fronts, ventilated back' },
  { name: 'Foyer console with mirror', category: 'Living & Dining', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: 'Wall-hung console with drawer, bevelled mirror panel and concealed LED' },
  { name: 'Pooja unit with jaali', category: 'Pooja & Foyer', unit: 'Sq.ft', defaultRate: 2450, costPrice: 1595, hsnSac: '9403', specNote: 'CNC-cut jaali in MDF or ply, PU finish, concealed LED, storage below' },
  { name: 'Pooja unit with shutters', category: 'Pooja & Foyer', unit: 'Sq.ft', defaultRate: 2150, costPrice: 1400, hsnSac: '9403', specNote: '19mm BWP ply with hinged or sliding shutters, PU finish, drawer storage, LED provision' },
  { name: 'Partition / jaali screen', category: 'Pooja & Foyer', unit: 'Sq.ft', defaultRate: 1850, costPrice: 1200, hsnSac: '9403', specNote: 'CNC-cut MDF or WPC jaali on frame, PU or laminate finish, floor and ceiling fixed' },
  { name: 'Dining table', category: 'Living & Dining', unit: 'Nos', defaultRate: 58000, costPrice: 37700, hsnSac: '9403', specNote: 'Six seater, ply or solid wood frame with veneer, glass or quartz top as specified. Chairs extra' },

  /* ------------------------------- ceiling ------------------------------- */
  { name: 'False ceiling — gypsum', category: 'False Ceiling', unit: 'Sq.ft', defaultRate: 95, costPrice: 62, hsnSac: '9954', specNote: 'Saint-Gobain gypsum board on GI framing, taped and finished' },
  { name: 'False ceiling — gypsum with cove', category: 'False Ceiling', unit: 'Sq.ft', defaultRate: 135, costPrice: 88, hsnSac: '9954', specNote: 'Gypsum board on GI framing with a peripheral cove detail for concealed lighting' },
  { name: 'False ceiling — POP', category: 'False Ceiling', unit: 'Sq.ft', defaultRate: 105, costPrice: 68, hsnSac: '9954', specNote: 'POP on GI framing, finished ready for paint, moulding as specified' },
  { name: 'Ceiling — wooden rafters / slats', category: 'False Ceiling', unit: 'Sq.ft', defaultRate: 385, costPrice: 250, hsnSac: '9403', specNote: 'WPC or ply rafters with laminate or veneer finish on a concealed frame' },

  /* ------------------------------- lighting ------------------------------ */
  { name: 'Cove / profile lighting', category: 'Lighting', unit: 'R.ft', defaultRate: 180, costPrice: 115, hsnSac: '9405', specNote: 'Aluminium profile with diffuser, warm white LED strip' },
  { name: 'Recessed spot light', category: 'Lighting', unit: 'Nos', defaultRate: 1250, costPrice: 812, hsnSac: '9405', specNote: '7-12W COB recessed spot with driver, 3000K, anti-glare trim' },
  { name: 'Surface / track spot light', category: 'Lighting', unit: 'Nos', defaultRate: 1850, costPrice: 1200, hsnSac: '9405', specNote: 'Adjustable surface-mounted or track spot with driver, 3000K' },
  { name: 'Magnetic track lighting system', category: 'Lighting', unit: 'R.ft', defaultRate: 1450, costPrice: 942, hsnSac: '9405', specNote: 'Recessed or surface magnetic track with driver, spots and linear modules charged separately' },
  { name: 'Chandelier / pendant point', category: 'Lighting', unit: 'Nos', defaultRate: 1650, costPrice: 1070, hsnSac: '9954', specNote: 'Ceiling hook, junction box, wiring and dimmer provision. Fixture supplied by client unless stated' },

  /* ----------------------------- wall finishes --------------------------- */
  { name: 'Wall painting — emulsion', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 32, costPrice: 20, hsnSac: '9954', specNote: 'Two coats putty, primer, two coats premium emulsion' },
  { name: 'Wall painting — luxury emulsion', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 48, costPrice: 31, hsnSac: '9954', specNote: 'Two coats putty, primer, two coats luxury washable emulsion, low VOC' },
  { name: 'Texture / stencil wall finish', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 145, costPrice: 94, hsnSac: '9954', specNote: 'Designer texture or stencil work by a specialist applicator, sealed and top coated' },
  { name: 'Wallpaper installation', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 110, costPrice: 70, hsnSac: '4814', specNote: 'Imported wallpaper, adhesive and installation included' },
  { name: 'Fluted / louver wall panelling', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 465, costPrice: 302, hsnSac: '4412', specNote: 'WPC or MDF fluted panel on ply base, laminate or PU finish, concealed fixing' },
  { name: 'Upholstered wall panelling', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 1150, costPrice: 748, hsnSac: '9403', specNote: 'Ply base with foam and fabric or leatherette, tufted or channelled as specified' },
  { name: 'Wood polish — PU', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 145, costPrice: 94, hsnSac: '9954', specNote: 'Sanding, sealer and two coats PU in matte or gloss on veneer or solid wood' },
  { name: 'Melamine polish', category: 'Wall Finishes', unit: 'Sq.ft', defaultRate: 95, costPrice: 62, hsnSac: '9954', specNote: 'Sanding, sealer and melamine top coat on veneer or solid wood' },

  /* ------------------------------- flooring ------------------------------ */
  { name: 'Laminate wooden flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 185, costPrice: 120, hsnSac: '4411', specNote: '8-12mm AC4 laminate plank with underlay and beading, click-lock' },
  { name: 'Engineered wood flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 465, costPrice: 302, hsnSac: '4412', specNote: '14mm engineered oak plank, glue-down or click, with beading' },
  { name: 'Vinyl plank flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 165, costPrice: 107, hsnSac: '3918', specNote: '2-3mm LVT plank, glue-down on levelled surface' },
  { name: 'Vitrified tile flooring', category: 'Flooring', unit: 'Sq.ft', defaultRate: 155, costPrice: 101, hsnSac: '6907', specNote: '600x600 vitrified tile laid on cement mortar with epoxy grout' },
  { name: 'Skirting — wooden or PVC', category: 'Flooring', unit: 'R.ft', defaultRate: 125, costPrice: 81, hsnSac: '3916', specNote: '75-100mm skirting to match the flooring, mitred at corners' },

  /* ---------------------------- doors & windows -------------------------- */
  { name: 'Flush door with laminate', category: 'Doors & Windows', unit: 'Nos', defaultRate: 12500, costPrice: 8125, hsnSac: '4418', specNote: '32mm solid-core flush door with laminate both sides, hardware and lock included' },
  { name: 'Moulded panel door', category: 'Doors & Windows', unit: 'Nos', defaultRate: 9800, costPrice: 6370, hsnSac: '4418', specNote: 'Factory-moulded skin door with enamel paint finish, hardware included' },
  { name: 'Sliding door — internal', category: 'Doors & Windows', unit: 'Sq.ft', defaultRate: 1450, costPrice: 942, hsnSac: '4418', specNote: 'Ply or WPC sliding leaf with aluminium top-hung track and soft close' },
  { name: 'Door frame — WPC', category: 'Doors & Windows', unit: 'R.ft', defaultRate: 485, costPrice: 315, hsnSac: '3925', specNote: 'WPC door frame with architrave, primed and finished' },

  /* ------------------------------ electrical ----------------------------- */
  { name: 'Electrical point — new', category: 'Electrical', unit: 'Nos', defaultRate: 850, costPrice: 540, hsnSac: '9954', specNote: 'Concealed conduiting, FR wire, modular switch and plate' },
  { name: 'Modular switch & socket', category: 'Electrical', unit: 'Nos', defaultRate: 620, costPrice: 400, hsnSac: '8536', specNote: 'Legrand / Schneider modular range' },
  { name: 'TV / data point', category: 'Electrical', unit: 'Nos', defaultRate: 1450, costPrice: 942, hsnSac: '8544', specNote: 'Concealed conduit with coaxial or Cat6 cable, I/O box and faceplate' },
  { name: 'Smart switch / automation point', category: 'Electrical', unit: 'Nos', defaultRate: 4500, costPrice: 2925, hsnSac: '8537', specNote: 'Wi-Fi or Zigbee smart switch module with neutral wiring and app configuration' },
  { name: 'Distribution board upgrade', category: 'Electrical', unit: 'Nos', defaultRate: 18500, costPrice: 12000, hsnSac: '8537', specNote: 'New DB with MCBs and RCCB, circuit labelling and testing' },

  /* ------------------------------ furnishing ----------------------------- */
  { name: 'Curtains with track', category: 'Furnishing', unit: 'Sq.ft', defaultRate: 240, costPrice: 155, hsnSac: '6303', specNote: 'Blackout lining, motorised track optional' },
  { name: 'Roller blind', category: 'Furnishing', unit: 'Sq.ft', defaultRate: 195, costPrice: 127, hsnSac: '6303', specNote: 'Sunscreen or blackout roller blind with chain or motorised operation' },
  { name: 'Roman blind', category: 'Furnishing', unit: 'Sq.ft', defaultRate: 385, costPrice: 250, hsnSac: '6303', specNote: 'Fabric roman blind with cord or motorised mechanism and valance' },
  { name: 'Venetian / zebra blind', category: 'Furnishing', unit: 'Sq.ft', defaultRate: 265, costPrice: 172, hsnSac: '6303', specNote: 'Aluminium venetian or fabric zebra blind with chain operation' },
  { name: 'Sofa upholstery', category: 'Furnishing', unit: 'Nos', defaultRate: 16500, costPrice: 10725, hsnSac: '9401', specNote: 'Per seat: ply frame, high-density foam, fabric or leatherette as selected' },

  /* ------------------------------- bathroom ------------------------------ */
  { name: 'Bathroom vanity unit', category: 'Bathroom', unit: 'Sq.ft', defaultRate: 2150, costPrice: 1400, hsnSac: '9403', specNote: 'Marine ply or WPC carcass with laminate or PU finish, counter and basin extra' },
  { name: 'Mirror with backlight', category: 'Bathroom', unit: 'Nos', defaultRate: 12500, costPrice: 8125, hsnSac: '7009', specNote: 'Bevelled mirror with concealed LED backlight, touch switch and demister option' },
  { name: 'Glass shower partition', category: 'Bathroom', unit: 'Sq.ft', defaultRate: 685, costPrice: 445, hsnSac: '7007', specNote: '8-10mm toughened glass with SS fittings, fixed or hinged panel' },

  /* ------------------------------ professional --------------------------- */
  { name: 'Design & 3D visualisation', category: 'Professional', unit: 'Lump sum', defaultRate: 35000, costPrice: 12000, hsnSac: '9983', specNote: 'Floor plans, elevations, 3D renders, material board, two revision rounds' },
  { name: 'Project management & supervision', category: 'Professional', unit: 'Lump sum', defaultRate: 45000, costPrice: 18000, hsnSac: '9983', specNote: 'Site coordination, vendor management, quality checks, handover' },
  { name: 'Site measurement & survey', category: 'Professional', unit: 'Lump sum', defaultRate: 6500, costPrice: 2400, hsnSac: '9983', specNote: 'Detailed site measurement, service locations and dimensioned drawings' },
  { name: 'Dismantling of existing furniture', category: 'Professional', unit: 'Lump sum', defaultRate: 15000, costPrice: 9750, hsnSac: '9954', specNote: 'Careful dismantling and removal of existing joinery, making good the surfaces' },
  { name: 'Deep cleaning at handover', category: 'Professional', unit: 'Lump sum', defaultRate: 9500, costPrice: 6175, hsnSac: '9994', specNote: 'Post-work deep clean of all surfaces, glass and floors before handover' },

  /* ---------------------- design fees, scaled by home size ---------------
   * Benchmarked Aug 2026 against the prevailing Hyderabad market, where full
   * design service is billed at roughly 4-5% of project value. The flat
   * 'Design & 3D visualisation' line above works out to under 2% on a large
   * home and is kept only for small or single-room jobs.
   * ---------------------------------------------------------------------- */
  { name: 'Design fee — 2BHK apartment', category: 'Professional', unit: 'Lump sum', defaultRate: 55000, costPrice: 18000, hsnSac: '9983', specNote: 'Full design service: measured drawings, layouts, elevations, 3D renders of all rooms, material and finish board, two revision rounds, GFC drawings for execution' },
  { name: 'Design fee — 3BHK apartment', category: 'Professional', unit: 'Lump sum', defaultRate: 95000, costPrice: 31000, hsnSac: '9983', specNote: 'Full design service: measured drawings, layouts, elevations, 3D renders of all rooms, material and finish board, two revision rounds, GFC drawings for execution' },
  { name: 'Design fee — 4BHK or duplex', category: 'Professional', unit: 'Lump sum', defaultRate: 145000, costPrice: 47000, hsnSac: '9983', specNote: 'Full design service across both levels: measured drawings, layouts, elevations, 3D renders, material and finish board, two revision rounds, GFC drawings for execution' },
  { name: 'Design fee — villa or independent house', category: 'Professional', unit: 'Lump sum', defaultRate: 225000, costPrice: 73000, hsnSac: '9983', specNote: 'Full design service including facade and landscape coordination, measured drawings, layouts, elevations, 3D renders, material board, three revision rounds, GFC drawings' },
  { name: 'Design fee — built-up area basis', category: 'Professional', unit: 'Sq.ft', defaultRate: 55, costPrice: 18, hsnSac: '9983', specNote: 'Charged on built-up area where the home does not fit a standard configuration. Same scope as the fixed design fee tiers' },
  { name: 'Design revision — additional round', category: 'Professional', unit: 'Nos', defaultRate: 12000, costPrice: 4000, hsnSac: '9983', specNote: 'Each revision round beyond those included in the design fee: layout rework, fresh renders and updated material board' },

  /* ------------------- site protection and site services -----------------
   * Billed separately rather than absorbed into overheads. Competitors quote
   * this block at full rate and hold it out of any project discount.
   * ---------------------------------------------------------------------- */
  { name: 'Floor protection — corrugated sheet', category: 'Site Protection & Services', unit: 'Sq.ft', defaultRate: 18, costPrice: 11, hsnSac: '9954', specNote: 'Corrugated plastic sheet laid over finished flooring with taped joints, maintained through the works and lifted at handover' },
  { name: 'Door & frame protection wrap', category: 'Site Protection & Services', unit: 'Nos', defaultRate: 450, costPrice: 280, hsnSac: '9954', specNote: 'Bubble wrap and corrugated sheet over door shutters, frames and architraves to prevent transit and installation damage' },
  { name: 'Window & glass protection film', category: 'Site Protection & Services', unit: 'Sq.ft', defaultRate: 28, costPrice: 17, hsnSac: '9954', specNote: 'Self-adhesive protective film over glazing and glass railings, removed at handover' },
  { name: 'Dust barricading — sheet partition', category: 'Site Protection & Services', unit: 'Sq.ft', defaultRate: 45, costPrice: 28, hsnSac: '9954', specNote: 'Temporary plastic sheet partition on a light frame to isolate work zones in an occupied home' },
  { name: 'Product cleaning & de-labelling', category: 'Site Protection & Services', unit: 'Lump sum', defaultRate: 13500, costPrice: 8000, hsnSac: '9994', specNote: 'On-site cleaning of installed modular and custom units: label and gum-mark removal, pencil marks, dusting and stretch-wrap packing until handover' },
  { name: 'Debris removal & disposal', category: 'Site Protection & Services', unit: 'Lump sum', defaultRate: 8500, costPrice: 5500, hsnSac: '9994', specNote: 'Collection, bagging and off-site disposal of packaging and construction debris through the project' },
];
