// Type stubs for packages blocked by the package firewall.
// Real implementations are swapped in via vite.config.ts aliases once available (see Task #4).
declare module "jspdf" {
  const jsPDF: any;
  export default jsPDF;
  export { jsPDF };
}

declare module "html2canvas" {
  const html2canvas: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  export default html2canvas;
}

declare module "bwip-js" {
  const bwipjs: any;
  export default bwipjs;
  export = bwipjs;
}
