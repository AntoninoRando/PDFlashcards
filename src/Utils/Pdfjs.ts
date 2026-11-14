/*
  Shared pdf.js setup: the worker, a cache of opened documents and the viewer
  components (`pdfjs-dist/web/pdf_viewer.mjs`).
*/
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/* Documents stay open for the whole session: object URLs of uploaded PDFs do
   not change, and reopening a view should not parse them again. */
const documents = new Map<string, Promise<PDFDocumentProxy>>()

export function openDocument(url: string): Promise<PDFDocumentProxy> {
  let doc = documents.get(url)
  if (!doc) {
    doc = pdfjs.getDocument({ url }).promise
    doc.catch(() => documents.delete(url))
    documents.set(url, doc)
  }
  return doc
}

type ViewerModule = typeof import('pdfjs-dist/web/pdf_viewer.mjs')
let viewerModule: Promise<ViewerModule> | null = null

/** The viewer module reads the library from `globalThis.pdfjsLib` when it is evaluated, hence the dynamic import. */
export function loadViewer(): Promise<ViewerModule> {
  if (!viewerModule) {
    ;(globalThis as any).pdfjsLib = pdfjs
    viewerModule = import('pdfjs-dist/web/pdf_viewer.mjs')
  }
  return viewerModule
}
