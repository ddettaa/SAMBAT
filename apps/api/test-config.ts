import { calculatePriority } from "./src/config";

const result = calculatePriority({ U: Number.NaN, D: Infinity, V: -1, T: 200, R: "50" });
if (!Number.isFinite(result.score)) throw new Error("SMART score must be finite");
if (result.score < 0 || result.score > 100) throw new Error(`SMART score out of range: ${result.score}`);
if (result.inputs.U !== 0 || result.inputs.D !== 0 || result.inputs.V !== 0 || result.inputs.T !== 100 || result.inputs.R !== 50) {
  throw new Error(`unexpected normalization: ${JSON.stringify(result.inputs)}`);
}
console.log("SMART CONFIG TEST PASSED", result.score);
