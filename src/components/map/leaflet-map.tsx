"use client";

import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPosition, ScenarioMapData } from "./map-data";
import type { DummyPreview } from "@/lib/validation/dummy-preview";

const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const icons = {
  depot: L.divIcon({
    className:
      "rounded-md border-2 border-white bg-blue-700 font-bold text-white shadow-md",
    html: '<span class="grid h-full place-items-center" aria-hidden="true">D</span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }),
  order: L.divIcon({
    className:
      "rounded-full border-2 border-white bg-teal-700 font-bold text-white shadow-md",
    html: '<span class="grid h-full place-items-center" aria-hidden="true">O</span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }),
  preview: L.divIcon({
    className:
      "rounded-full border-2 border-white bg-violet-700 font-bold text-white shadow-md",
    html: '<span class="grid h-full place-items-center" aria-hidden="true">P</span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }),
};

function addMarker(
  map: L.Map,
  position: MapPosition,
  kind: keyof typeof icons,
  label: string,
  lines: (string | null)[],
  editHref?: string,
) {
  const popup = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = label;
  popup.append(heading);
  for (const line of lines) {
    if (!line) continue;
    const detail = document.createElement("div");
    detail.textContent = line;
    popup.append(detail);
  }
  const focusTarget = editHref ? document.createElement("a") : popup;
  if (editHref && focusTarget instanceof HTMLAnchorElement) {
    focusTarget.href = editHref;
    focusTarget.className =
      "mt-2 inline-flex min-h-11 items-center font-semibold underline";
    focusTarget.textContent = kind === "depot" ? "Edit Depot" : "Edit Order";
    popup.append(focusTarget);
  } else {
    popup.tabIndex = -1;
  }
  const marker = L.marker(position, {
    icon: icons[kind],
    title: label,
    alt: label,
  });
  marker.once("add", () => {
    const icon = marker.getElement();
    if (!icon) return;
    icon.setAttribute("aria-label", label);
    icon.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      marker.openPopup();
      focusTarget.focus();
    });
    focusTarget.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== "Escape") return;
      event.stopPropagation();
      marker.closePopup();
      icon.focus();
    });
  });
  marker.bindPopup(popup).addTo(map);
}

type MapProps =
  | { data: ScenarioMapData; preview?: never }
  | { preview: DummyPreview; data?: never };

function drawPreview(map: L.Map, preview: DummyPreview): MapPosition[] {
  const depot: MapPosition = [preview.depot.latitude, preview.depot.longitude];
  addMarker(map, depot, "depot", `Depot ${preview.depot.name}`, [
    depot.join(", "),
  ]);
  const points = preview.points.map(({ latitude, longitude }, index) => {
    // Plot the nearest wrapped longitude so fitBounds stays local at ±180°.
    const offset = ((longitude - depot[1] + 540) % 360) - 180;
    const point: MapPosition = [latitude, depot[1] + offset];
    addMarker(map, point, "preview", `Titik preview ${index + 1}`, [
      `${latitude}, ${longitude}`,
    ]);
    return point;
  });
  return [depot, ...points];
}

function drawScenario(map: L.Map, data: ScenarioMapData): MapPosition[] {
  const positions: MapPosition[] = [];
  const { depot, orders, scenarioId } = data;
  const editQuery = `?scenarioId=${scenarioId}&edit=`;
  if (depot.position) {
    positions.push(depot.position);
    addMarker(
      map,
      depot.position,
      "depot",
      `Depot ${depot.name}`,
      [depot.address, depot.position.join(", ")],
      `/depots${editQuery}${depot.id}`,
    );
  }
  for (const order of orders) {
    if (!order.position) continue;
    positions.push(order.position);
    addMarker(
      map,
      order.position,
      "order",
      `Order ${order.orderCode}`,
      [order.customerName, order.address, order.position.join(", ")],
      `/orders${editQuery}${order.id}`,
    );
  }
  return positions;
}

export default function LeafletMap({ data, preview }: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [tileFailed, setTileFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const map = L.map(element, {
      maxZoom: 19,
      scrollWheelZoom: false,
    });
    const positions = preview
      ? drawPreview(map, preview)
      : drawScenario(map, data);

    if (positions.length === 1) map.setView(positions[0], 14);
    else if (positions.length > 1)
      map.fitBounds(L.latLngBounds(positions), {
        padding: [24, 24],
        maxZoom: 15,
      });
    const tiles = L.tileLayer(tileUrl, { attribution, maxZoom: 19 });
    const onTileError = () => setTileFailed(true);
    tiles.on("tileerror", onTileError).addTo(map);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() =>
            map.invalidateSize({ debounceMoveend: true }),
          );
    resizeObserver?.observe(element);

    return () => {
      resizeObserver?.disconnect();
      tiles.off("tileerror", onTileError);
      map.remove();
    };
  }, [data, preview]);

  return (
    <div className="space-y-2">
      <div
        ref={container}
        role="region"
        aria-label={
          preview
            ? "Peta preview Depot dan titik dummy"
            : "Peta Depot dan Order"
        }
        className="relative isolate z-0 h-[26rem] overflow-hidden rounded-xl border border-gray-200 sm:h-[30rem] xl:h-[34rem] dark:border-gray-800"
      />
      {tileFailed && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Sebagian tile peta gagal dimuat.{" "}
          {preview
            ? "Daftar koordinat tetap tersedia."
            : "Daftar Order tetap tersedia."}
        </p>
      )}
    </div>
  );
}
