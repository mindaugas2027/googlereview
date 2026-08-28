import { PDFDocument } from 'pdf-lib'
import QRCode from 'qrcode'

/**
 * Spaudai skirto PDF generavimas.
 *
 * Šablonas „public/Qr.pdf" (A4, 595.276 × 841.89 pt) turi paruoštą baltą kvadratą
 * su užrašu „NUKREIPKITE KAMERĄ ČIA". Šablono turinio sraute ši vieta apibrėžta
 * clip'u „184.252 554.253 226.772 -226.772 re W n" — tai tikslus kvadratas,
 * kuriame turi atsidurti kliento QR kodas (PDF taškais, kilmė — apatiniame kairiajame kampe).
 */
export const QR_TEMPLATE_FILENAME = 'Qr.pdf'

/** QR vietos šablone: viršutinis kairysis kampas (x, y) ir kvadrato kraštinė (pt). */
export const QR_PLACEMENT = { x: 184.252, y: 327.481, size: 226.772 } as const

const QR_IMAGE_PIXELS = 1200 // ~380 DPI spaudai esant ~80 mm kvadratui

export type GeneratePrintPdfInput = {
  /** Nekeistas PDF šablono turinys (pvz., perskaitytas iš public/Qr.pdf). */
  templatePdf: ArrayBuffer | Uint8Array
  /** Nuoroda, kurią koduoja QR (kliento įvertinimo puslapis). */
  reviewUrl: string
}

/**
 * Sugeneruoja spaudai skirtą PDF: įterpia kliento QR kodą į šablono kvadratą
 * ir grąžina galutinio PDF baitus.
 */
export async function generatePrintReadyPdf({ templatePdf, reviewUrl }: GeneratePrintPdfInput): Promise<Uint8Array> {
  if (!reviewUrl) throw new Error('Nenurodyta QR nuoroda (reviewUrl).')

  const pdfDoc = await PDFDocument.load(templatePdf)
  const page = pdfDoc.getPages()[0]
  if (!page) throw new Error('PDF šablone nerastas puslapis.')

  const qrPng = await QRCode.toBuffer(reviewUrl, {
    type: 'png',
    width: QR_IMAGE_PIXELS,
    margin: 4, // standartinė „ramioji zona" aplink QR — būtina patikram nuskaitymui
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  })

  const qrImage = await pdfDoc.embedPng(qrPng)
  page.drawImage(qrImage, {
    x: QR_PLACEMENT.x,
    y: QR_PLACEMENT.y,
    width: QR_PLACEMENT.size,
    height: QR_PLACEMENT.size,
  })

  return pdfDoc.save()
}
