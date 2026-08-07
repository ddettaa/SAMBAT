import { migrate } from "./db";
import { syncFloodFromGeoportal } from "./geo";

const result = {
  flood: await syncFloodFromGeoportal(),
};

console.log(JSON.stringify(result));
