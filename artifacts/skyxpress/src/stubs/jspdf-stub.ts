// Stub — jsPDF is replaced by the real package at runtime via CDN/npm.
// This stub is only active when the real package fails to resolve.
export class jsPDF {
  constructor(..._args: any[]) {}
  addImage(..._args: any[]) { return this; }
  addPage(..._args: any[]) { return this; }
  setFont(..._args: any[]) { return this; }
  setFontSize(..._args: any[]) { return this; }
  setTextColor(..._args: any[]) { return this; }
  setDrawColor(..._args: any[]) { return this; }
  setFillColor(..._args: any[]) { return this; }
  setLineWidth(..._args: any[]) { return this; }
  rect(..._args: any[]) { return this; }
  roundedRect(..._args: any[]) { return this; }
  circle(..._args: any[]) { return this; }
  ellipse(..._args: any[]) { return this; }
  line(..._args: any[]) { return this; }
  lines(..._args: any[]) { return this; }
  text(..._args: any[]) { return this; }
  splitTextToSize(text: string, _maxW: number): string[] { return [text]; }
  save(..._args: any[]) { alert("PDF generation is not available in this environment."); }
  output(..._args: any[]) { return ""; }
  internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
  getNumberOfPages() { return 1; }
  setPage(..._args: any[]) { return this; }
}
export default jsPDF;
