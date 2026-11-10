export type OcrResult = {
  supported: false;
  reason: string;
};

export async function extractScannedPdf(): Promise<OcrResult> {
  return {
    supported: false,
    reason:
      "OCR is not implemented. Mark the resource as ocr_required. Do not treat empty extraction as success.",
  };
}
