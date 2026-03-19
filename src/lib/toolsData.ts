export type ToolCategory = 'organize' | 'convert' | 'optimize' | 'security' | 'edit';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  inputType: 'single' | 'multi' | 'images';
  inputLabel: string;
  outputLabel: string;
  pipelineCompatible?: boolean;
}

export const tools: Tool[] = [
  { id: 'merge', name: 'Merge PDF', description: 'Combine multiple PDF files into one document', category: 'organize', icon: 'Layers', inputType: 'multi', inputLabel: 'Multiple PDFs', outputLabel: 'Single PDF' },
  { id: 'split', name: 'Split PDF', description: 'Split a PDF into multiple documents by page ranges', category: 'organize', icon: 'Scissors', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Multiple PDFs' },
  { id: 'remove-pages', name: 'Remove Pages', description: 'Remove specific pages from a PDF document', category: 'organize', icon: 'Trash2', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Single PDF', pipelineCompatible: true },
  { id: 'reorder', name: 'Reorder Pages', description: 'Rearrange pages in any order you want', category: 'organize', icon: 'ArrowUpDown', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Single PDF' },
  { id: 'rotate', name: 'Rotate PDF', description: 'Rotate pages by 90°, 180°, or 270° degrees', category: 'organize', icon: 'RotateCw', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Single PDF', pipelineCompatible: true },
  { id: 'pdf-to-images', name: 'PDF to Images', description: 'Convert each page of a PDF to PNG images', category: 'convert', icon: 'Image', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'PNG Images' },
  { id: 'images-to-pdf', name: 'Images to PDF', description: 'Convert multiple images into a single PDF', category: 'convert', icon: 'FileImage', inputType: 'images', inputLabel: 'Multiple Images', outputLabel: 'Single PDF' },
  { id: 'pdf-to-text', name: 'PDF to Text', description: 'Extract all text content from a PDF', category: 'convert', icon: 'FileText', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Text File' },
  { id: 'compress', name: 'Compress PDF', description: 'Reduce PDF file size with three compression levels — lossless, balanced, or maximum.', category: 'optimize', icon: 'Minimize2', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Smaller PDF', pipelineCompatible: true },
  { id: 'repair', name: 'Repair PDF', description: 'Re-parse and re-save a potentially corrupted PDF', category: 'optimize', icon: 'Wrench', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Repaired PDF', pipelineCompatible: true },
  { id: 'protect', name: 'Protect PDF', description: 'Add password encryption to your PDF', category: 'security', icon: 'Lock', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Protected PDF', pipelineCompatible: true },
  { id: 'unlock', name: 'Unlock PDF', description: 'Remove password protection from a PDF', category: 'security', icon: 'Unlock', inputType: 'single', inputLabel: 'Protected PDF', outputLabel: 'Unlocked PDF' },
  { id: 'watermark', name: 'Watermark PDF', description: 'Add a text watermark across all pages', category: 'security', icon: 'Droplets', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Watermarked PDF', pipelineCompatible: true },
  { id: 'remove-metadata', name: 'Remove Metadata', description: 'Strip author, software, dates and hidden info from your PDF before sharing.', category: 'security', icon: 'EyeOff', inputType: 'single', inputLabel: 'PDF file', outputLabel: 'Clean PDF', pipelineCompatible: true },
  { id: 'page-numbers', name: 'Add Page Numbers', description: 'Add page numbers to the bottom of each page', category: 'edit', icon: 'Hash', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Numbered PDF', pipelineCompatible: true },
  // { id: 'blank-pages', name: 'Add Blank Pages', description: 'Insert blank pages at specified positions', category: 'edit', icon: 'FilePlus', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Modified PDF' },
  { id: 'crop', name: 'Crop PDF', description: 'Adjust margins and crop area of PDF pages', category: 'edit', icon: 'Crop', inputType: 'single', inputLabel: 'Single PDF', outputLabel: 'Cropped PDF', pipelineCompatible: true },
  { id: 'sign', name: 'Sign PDF', description: 'Draw or type your signature and place it on any page of your PDF.', category: 'edit', icon: 'PenTool', inputType: 'single', inputLabel: 'PDF file', outputLabel: 'Signed PDF' },
  { id: 'fill-forms', name: 'Fill & Flatten Forms', description: 'Fill in PDF form fields and flatten them into a permanent static document.', category: 'edit', icon: 'ClipboardList', inputType: 'single', inputLabel: 'PDF with form fields', outputLabel: 'Filled PDF' },
  { id: 'redact', name: 'Redact PDF', description: 'Permanently black out sensitive text and images before sharing.', category: 'edit', icon: 'EyeOff', inputType: 'single', inputLabel: 'PDF file', outputLabel: 'Redacted PDF' },
  { id: 'pdf-to-zip', name: 'PDF to ZIP', description: 'Convert every page to a PNG image and download them all as a single ZIP file.', category: 'convert', icon: 'Archive', inputType: 'single', inputLabel: 'PDF file', outputLabel: 'ZIP of images' },
];

export const pipelineTools = tools.filter(t => t.pipelineCompatible);

export const categories: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'organize', label: 'Organize', icon: 'FolderOpen' },
  { id: 'convert', label: 'Convert', icon: 'RefreshCw' },
  { id: 'optimize', label: 'Optimize', icon: 'Zap' },
  { id: 'security', label: 'Security', icon: 'Shield' },
  { id: 'edit', label: 'Edit', icon: 'PenTool' },
];

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter(t => t.category === category);
}

export const categoryColors: Record<ToolCategory, { bg: string; text: string }> = {
  organize: { bg: 'bg-badge-organize', text: 'text-badge-organize-text' },
  convert: { bg: 'bg-badge-convert', text: 'text-badge-convert-text' },
  optimize: { bg: 'bg-badge-optimize', text: 'text-badge-optimize-text' },
  security: { bg: 'bg-badge-security', text: 'text-badge-security-text' },
  edit: { bg: 'bg-badge-edit', text: 'text-badge-edit-text' },
};
