/**
 * Best-effort text extraction from an uploaded PDF.
 *
 * Used for keyword search and for the manual review path when no AI key is
 * configured. The AI analysis itself sends the original PDF to Claude as a
 * document block, so a failure here never blocks analysis.
 */
export async function extractPdfText(
  data: Buffer,
): Promise<{ text: string; pageCount: number } | null> {
  try {
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
    });
    const doc = await loadingTask.promise;

    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    }

    const result = { text: pages.join('\n\n'), pageCount: doc.numPages };
    // Release the worker; the API surface differs across pdfjs builds, so try
    // both and never let cleanup lose an otherwise successful extraction.
    await (loadingTask.destroy?.() ?? doc.destroy?.() ?? Promise.resolve()).catch?.(() => {});
    return result;
  } catch (err) {
    console.warn('[pdf] text extraction failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
