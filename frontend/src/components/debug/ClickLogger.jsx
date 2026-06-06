import { useEffect } from "react";

import { tokenService } from "@/api/axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const buildSafeText = (text) => {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  return normalized.slice(0, 120);
};

const getClosestClickable = (target) =>
  target?.closest?.("button, a, [role='button'], input, select, textarea, label") || target;

const buildPayload = (event) => {
  const element = getClosestClickable(event.target);
  if (!element || !element.tagName) return null;

  return {
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    href: element.getAttribute?.("href") || null,
    tag_name: element.tagName.toLowerCase(),
    role: element.getAttribute?.("role") || null,
    text: buildSafeText(element.textContent),
    element_id: element.id || null,
    class_name: buildSafeText(element.className),
    button_type: element.tagName === "BUTTON" ? element.type || null : null,
    input_type: element.tagName === "INPUT" ? element.type || null : null,
    aria_label: element.getAttribute?.("aria-label") || null,
    name: element.getAttribute?.("name") || null,
    x: Number.isFinite(event.clientX) ? event.clientX : null,
    y: Number.isFinite(event.clientY) ? event.clientY : null,
  };
};

const sendClickEvent = async (payload) => {
  if (!payload) return;

  console.info("[ui-click]", payload);

  const url = `${BASE_URL}/ui-events/click`;
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokenService.getToken()
          ? { Authorization: `Bearer ${tokenService.getToken()}` }
          : {}),
      },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort logging only; console output above still records the click.
  }
};

const ClickLogger = () => {
  useEffect(() => {
    const handleClick = (event) => {
      const payload = buildPayload(event);
      void sendClickEvent(payload);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
};

export default ClickLogger;
