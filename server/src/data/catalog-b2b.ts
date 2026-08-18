import type { CatalogSeed } from './catalog-types.js';

/** B2B Procurement & Resale starter catalog — products sourced and resold. */
export const B2B_CATALOG: CatalogSeed[] = [
  { name: 'Ergonomic task chair', sku: 'CHR-ERG-001', brand: 'Featherlite', category: 'Seating', unit: 'Nos', defaultRate: 14500, costPrice: 9800, hsnSac: '9401', specNote: 'Mesh back, 4D armrest, synchro tilt, 5-year warranty' },
  { name: 'Visitor chair — cantilever', sku: 'CHR-VIS-002', brand: 'Godrej', category: 'Seating', unit: 'Nos', defaultRate: 6200, costPrice: 4100, hsnSac: '9401', specNote: 'Powder-coated MS frame, fabric upholstery' },
  { name: 'Workstation — 4 seater linear', sku: 'WKS-LIN-004', brand: 'Zen Modular', category: 'Workstations', unit: 'Set', defaultRate: 68000, costPrice: 46500, hsnSac: '9403', specNote: '25mm prelam top, 60mm raceway, fabric tack board, 3-drawer pedestal' },
  { name: 'Conference table — 10 seater', sku: 'TBL-CNF-010', brand: 'Zen Modular', category: 'Tables', unit: 'Nos', defaultRate: 92000, costPrice: 61000, hsnSac: '9403', specNote: '3000x1200mm, veneer top, wire management box, powder-coated base' },
  { name: 'Storage unit — 4 door', sku: 'STO-4DR-001', brand: 'Godrej', category: 'Storage', unit: 'Nos', defaultRate: 24500, costPrice: 16800, hsnSac: '9403', specNote: 'CRCA steel, powder coated, 3-lever lock, adjustable shelves' },
  { name: 'Height-adjustable desk', sku: 'DSK-HAD-001', brand: 'Ergo India', category: 'Workstations', unit: 'Nos', defaultRate: 38000, costPrice: 26000, hsnSac: '9403', specNote: 'Dual-motor electric, 3 memory presets, anti-collision' },
  { name: 'Acoustic phone booth', sku: 'ACO-PBT-001', brand: 'SilentBox', category: 'Acoustics', unit: 'Nos', defaultRate: 185000, costPrice: 132000, hsnSac: '9403', specNote: 'Single occupancy, 30dB reduction, ventilation, LED, power and data' },
  { name: 'LED panel light 2x2', sku: 'LGT-PNL-2X2', brand: 'Philips', category: 'Lighting', unit: 'Nos', defaultRate: 2400, costPrice: 1550, hsnSac: '9405', specNote: '36W, 4000K, UGR<19, 3-year warranty' },
  { name: 'Carpet tile — loop pile', sku: 'FLR-CPT-001', brand: 'Welspun', category: 'Flooring', unit: 'Sq.ft', defaultRate: 165, costPrice: 108, hsnSac: '5703', gstRate: 12, specNote: '500x500mm, bitumen backing, commercial grade' },
  { name: 'Installation & commissioning', sku: 'SRV-INS-001', category: 'Services', unit: 'Lump sum', defaultRate: 25000, costPrice: 12000, hsnSac: '9987', specNote: 'Unloading, assembly, placement, debris removal, sign-off' },
];
