"use client";

import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPosition, ScenarioMapData } from "./map-data";

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
};

function addMarker(
  map: L.Map,
  position: MapPosition,
  kind: keyof typeof icons,
  label: string,
  lines: (string | null)[],
  editHref: string,
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
  const edit = document.createElement("a");
  edit.href = editHref;
  edit.className =
    "mt-2 inline-flex min-h-11 items-center font-semibold underline";
  edit.textContent = kind === "depot" ? "Edit Depot" : "Edit Order";
  popup.append(edit);
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
      edit.focus();
    });
    edit.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      marker.closePopup();
      icon.focus();
    });
  });
  marker.bindPopup(popup).addTo(map);
}

export default function LeafletMap({ data }: { data: ScenarioMapData }) {
  const container = useRef<HTMLDivElement>(null);
  const [tileFailed, setTileFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const positions: MapPosition[] = [];
    const map = L.map(element, {
      maxZoom: 19,
      scrollWheelZoom: false,
    });
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
  }, [data]);

  return (
    <div className="space-y-2">
      <div
        ref={container}
        role="region"
        aria-label="Peta Depot dan Order"
        className="relative isolate z-0 h-[26rem] overflow-hidden rounded-xl border border-gray-200 sm:h-[30rem] xl:h-[34rem] dark:border-gray-800"
      />
      {tileFailed && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Sebagian tile peta gagal dimuat. Daftar Order tetap tersedia.
        </p>
      )}
    </div>
  );
}
