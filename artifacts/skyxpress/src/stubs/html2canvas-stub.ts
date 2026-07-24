// Stub — html2canvas unavailable in this environment
const html2canvas = async (_el: any, _opts?: any): Promise<HTMLCanvasElement> => {
  console.warn("html2canvas not available");
  return document.createElement("canvas");
};
export default html2canvas;
