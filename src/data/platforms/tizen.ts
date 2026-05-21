import type { Platform } from "../types";

/**
 * Placeholder Tizen TV browser mappings (2018 → latest).
 * Update chromiumVersion / launchKey when you pin real test binaries.
 * Sources: Samsung Tizen release notes & public UA samples — verify on devices.
 */
export const tizenPlatform: Platform = {
  id: "tizen",
  label: "Samsung Tizen",
  models: [
    {
      id: "tizen-2018",
      label: "2018 — Tizen 4.0 (MU/Family)",
      year: 2018,
      browser: {
        name: "Tizen WebKit (Chromium 56)",
        chromiumVersion: "56",
        notes: "Legacy MSE; limited ES2017",
        launchKey: "chromium-56",
      },
    },
    {
      id: "tizen-2019",
      label: "2019 — Tizen 4.5",
      year: 2019,
      browser: {
        name: "Tizen WebKit (Chromium 63)",
        chromiumVersion: "63",
        launchKey: "chromium-63",
      },
    },
    {
      id: "tizen-2020",
      label: "2020 — Tizen 5.5",
      year: 2020,
      browser: {
        name: "Tizen WebKit (Chromium 69)",
        chromiumVersion: "69",
        launchKey: "chromium-69",
      },
    },
    {
      id: "tizen-2021",
      label: "2021 — Tizen 6.0",
      year: 2021,
      browser: {
        name: "Tizen WebKit (Chromium 85)",
        chromiumVersion: "85",
        launchKey: "chromium-85",
      },
    },
    {
      id: "tizen-2022",
      label: "2022 — Tizen 6.5",
      year: 2022,
      browser: {
        name: "Tizen WebKit (Chromium 94)",
        chromiumVersion: "94",
        launchKey: "chromium-94",
      },
    },
    {
      id: "tizen-2023",
      label: "2023 — Tizen 7.0",
      year: 2023,
      browser: {
        name: "Tizen WebKit (Chromium 108)",
        chromiumVersion: "108",
        launchKey: "chromium-108",
      },
    },
    {
      id: "tizen-2024",
      label: "2024 — Tizen 8.0",
      year: 2024,
      browser: {
        name: "Tizen WebKit (Chromium 120)",
        chromiumVersion: "120",
        launchKey: "chromium-120",
      },
    },
    {
      id: "tizen-2025",
      label: "2025 — Tizen 9.0 (latest)",
      year: 2025,
      browser: {
        name: "Tizen WebKit (Chromium 126)",
        chromiumVersion: "126",
        launchKey: "chromium-126",
      },
    },
  ],
};
