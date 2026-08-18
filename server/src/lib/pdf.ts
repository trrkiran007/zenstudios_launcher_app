/**
 * HTML -> PDF.
 *
 * Two engines, in priority order:
 *  1. An injected renderer. The desktop app registers one backed by Electron's
 *     own Chromium, so PDF export always works there with nothing to install.
 *  2. Puppeteer, an optional dependency for terminal use. If Chromium was never
 *     downloaded the app still runs and the UI falls back to the print view.
 */
type PdfRenderer = (html: string) => Promise<Buffer>;

let injected: PdfRenderer | null = null;
let browserPromise: Promise<any> | null = null;
let unavailableReason: string | null = null;

/** Register an external PDF renderer (used by the desktop shell). */
export function setPdfRenderer(renderer: PdfRenderer | null) {
  injected = renderer;
}

async function getBrowser() {
  if (unavailableReason) throw new Error(unavailableReason);
  if (!browserPromise) {
    browserPromise = (async () => {
      const { default: puppeteer } = await import('puppeteer');
      return puppeteer.launch({ headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
    })().catch(() => {
      browserPromise = null;
      unavailableReason =
        'PDF engine unavailable (puppeteer/Chromium not installed). Use the Print view and "Save as PDF" instead.';
      throw new Error(unavailableReason);
    });
  }
  return browserPromise;
}

export async function isPdfEngineAvailable(): Promise<boolean> {
  if (injected) return true;
  try {
    await getBrowser();
    return true;
  } catch {
    return false;
  }
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  if (injected) return injected(html);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function closePdfEngine() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    /* nothing to close */
  }
  browserPromise = null;
}
