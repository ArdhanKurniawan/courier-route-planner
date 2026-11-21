import type { ScenarioMapData } from "./map-data";
import { calculateMapRoute, mapRouteFailure } from "./map-route";

self.onmessage = ({ data }: MessageEvent<ScenarioMapData>) => {
  try {
    self.postMessage(calculateMapRoute(data));
  } catch {
    self.postMessage({ status: "error", message: mapRouteFailure });
  }
};
