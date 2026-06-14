/**
 * Converte um HTML em PDF usando o Chrome instalado (via puppeteer-core),
 * aplicando margens ABNT (3/3/2/2 cm) e paginação no canto superior direito.
 * Uso: node html-to-pdf.js <chrome.exe> <entrada.html> <saida.pdf>
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const [, , CHROME, htmlPath, pdfPath] = process.argv;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const url = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'networkidle0' });
  const showPage = process.argv[5] !== 'nopage'; // 'nopage' => sem paginação (doc de 1 página)
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '3cm', bottom: '2cm', left: '3cm', right: '2cm' },
    displayHeaderFooter: showPage,
    // Paginação ABNT: número no canto superior direito (Arial 10)
    headerTemplate:
      '<div style="width:100%; margin:0; padding:0 2cm 0 0; font-family:Arial, sans-serif; font-size:10pt; text-align:right;">' +
      '<span class="pageNumber"></span></div>',
    footerTemplate: '<span></span>',
  });
  await browser.close();
  console.log('PDF gerado:', pdfPath);
})().catch((e) => { console.error(e); process.exit(1); });
