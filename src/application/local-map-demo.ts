import "server-only";

import type { ScenarioMapData } from "@/components/map/map-data";
import { localMapDemoId } from "@/lib/validation/map-road-route";

// Synthetic stops near public roads and landmarks in Semarang.
const locations: ReadonlyArray<readonly [name: string, latitude: number, longitude: number]> = [
  ["Balai Kota Semarang", -6.98264, 110.41312],
  ["Stasiun Poncol", -6.97322, 110.41455],
  ["Pasar Johar", -6.97185, 110.42680],
  ["Stasiun Tawang", -6.96465, 110.42770],
  ["Simpang Lima", -6.99009, 110.42435],
  ["Taman Indonesia Kaya", -6.99303, 110.42030],
  ["Sam Poo Kong", -6.99634, 110.39876],
  ["Taman Kasmaran", -6.98970, 110.41535],
];

export const localMapDemo = {
  depot: { id: "1", name: "Demo Tugu Muda", latitude: -6.98369, longitude: 110.41018 },
  orders: locations.map(([name, latitude, longitude], index) => ({
    id: String(101 + index),
    orderCode: `DEMO-${String(index + 1).padStart(2, "0")}`,
    customerName: `Sekitar ${name}`,
    latitude,
    longitude,
  })),
};

export const localMapDemoData: ScenarioMapData = {
  scenarioId: localMapDemoId,
  depot: {
    id: localMapDemo.depot.id,
    name: localMapDemo.depot.name,
    address: null,
    position: [localMapDemo.depot.latitude, localMapDemo.depot.longitude],
  },
  orders: localMapDemo.orders.map(({ id, orderCode, customerName, latitude, longitude }) => ({
    id,
    orderCode,
    customerName,
    address: null,
    position: [latitude, longitude],
  })),
};
