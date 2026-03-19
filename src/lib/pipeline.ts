import * as pdfTools from './pdfTools';

export interface PipelineStep {
  id: string;
  toolId: string;
  settings: StepSettings;
}

export interface StepSettings {
  watermarkText?: string;
  watermarkOpacity?: number;
  rotateAllDegrees?: number;
  password?: string;
  margins?: { top: number; right: number; bottom: number; left: number };
  blankAfter?: string;
}

export interface PipelineResult {
  stepId: string;
  toolId: string;
  success: boolean;
  outputSize: number;
  error?: string;
  durationMs: number;
}

export async function runPipeline(
  inputFile: File,
  steps: PipelineStep[],
  onStepComplete: (stepId: string, result: PipelineResult) => void
): Promise<Blob> {
  let currentBlob: Blob = new Blob([await inputFile.arrayBuffer()], { type: 'application/pdf' });
  let currentFile: File = inputFile;

  for (const step of steps) {
    const start = Date.now();
    try {
      let output: Blob;

      switch (step.toolId) {
        case 'compress':
          output = (await pdfTools.compressPdf(currentFile)).blob;
          break;
        case 'repair':
          output = await pdfTools.repairPdf(currentFile);
          break;
        case 'watermark':
          output = await pdfTools.addWatermark(
            currentFile,
            step.settings.watermarkText ?? 'CONFIDENTIAL',
            step.settings.watermarkOpacity ?? 0.3
          );
          break;
        case 'page-numbers':
          output = await pdfTools.addPageNumbers(currentFile);
          break;
        case 'protect': {
          const pw = step.settings.password ?? '';
          if (!pw) throw new Error('Password is required for Protect step');
          output = await pdfTools.protectPdf(currentFile, pw, pw);
          break;
        }
        case 'remove-metadata': {
          const { blob } = await pdfTools.removeMetadata(currentFile);
          output = blob;
          break;
        }
        case 'rotate': {
          const count = await pdfTools.getPageCount(currentFile);
          const rotations: Record<number, number> = {};
          for (let i = 0; i < count; i++) {
            rotations[i] = step.settings.rotateAllDegrees ?? 90;
          }
          output = await pdfTools.rotatePdf(currentFile, rotations);
          break;
        }
        case 'crop':
          output = await pdfTools.cropPdf(
            currentFile,
            step.settings.margins ?? { top: 0, right: 0, bottom: 0, left: 0 }
          );
          break;
        case 'remove-pages':
          output = currentBlob; // no-op in pipeline without page selection UI
          break;
        default:
          output = currentBlob;
      }

      const result: PipelineResult = {
        stepId: step.id,
        toolId: step.toolId,
        success: true,
        outputSize: output.size,
        durationMs: Date.now() - start,
      };

      onStepComplete(step.id, result);

      currentBlob = output;
      currentFile = new File([output], currentFile.name, { type: 'application/pdf' });

    } catch (err: any) {
      const result: PipelineResult = {
        stepId: step.id,
        toolId: step.toolId,
        success: false,
        outputSize: 0,
        durationMs: Date.now() - start,
        error: err?.message ?? 'Unknown error',
      };
      onStepComplete(step.id, result);
      throw err;
    }
  }

  return currentBlob;
}
