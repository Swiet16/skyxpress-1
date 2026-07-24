// Stub — jsPDF unavailable in this environment
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
  line(..._args: any[]) { return this; }
  text(..._args: any[]) { return this; }
  save(..._args: any[]) { alert("PDF generation is not available in this environment."); }
  output(..._args: any[]) { return ""; }
  internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
  getNumberOfPages() { return 1; }
  setPage(..._args: any[]) { return this; }
}
export default jsPDF;
