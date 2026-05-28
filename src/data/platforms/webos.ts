import type { Platform } from "../types";

/**
 * Placeholder LG webOS browser mappings (2018 → latest).
 * Update chromiumVersion / launchKey when you pin real test binaries.
 * Sources: LG webOS release notes & public UA samples — verify on devices.
 */
export const webosPlatform: Platform = {
  id: "webos",
  label: "LG webOS",
  models: [
    {
      id: "webos-2018",
      label: "2018 — webOS 4.0",
      year: 2018,
      browser: {
        name: "LG Browser (Chromium 53)",
        chromiumVersion: "53",
        notes: "Legacy MSE/EME behavior; validate playback on device",
        launchKey: "chromium-53",
      },
    },
    {
      id: "webos-2019",
      label: "2019 — webOS 4.5",
      year: 2019,
      browser: {
        name: "LG Browser (Chromium 68)",
        chromiumVersion: "68",
        launchKey: "chromium-68",
      },
    },
    {
      id: "webos-2020",
      label: "2020 — webOS 5.0",
      year: 2020,
      browser: {
        name: "LG Browser (Chromium 79)",
        chromiumVersion: "79",
        launchKey: "chromium-79",
      },
    },
    {
      id: "webos-2021",
      label: "2021 — webOS 6.0",
      year: 2021,
      browser: {
        name: "LG Browser (Chromium 79)",
        chromiumVersion: "79",
        launchKey: "chromium-79",
      },
    },
    {
      id: "webos-2022",
      label: "2022 — webOS 22",
      year: 2022,
      browser: {
        name: "LG Browser (Chromium 87)",
        chromiumVersion: "87",
        launchKey: "chromium-87",
      },
    },
    {
      id: "webos-2023",
      label: "2023 — webOS 23",
      year: 2023,
      browser: {
        name: "LG Browser (Chromium 94)",
        chromiumVersion: "94",
        launchKey: "chromium-94",
      },
    },
    {
      id: "webos-2024",
      label: "2024 — webOS 24",
      year: 2024,
      browser: {
        name: "LG Browser (Chromium 108)",
        chromiumVersion: "108",
        launchKey: "chromium-108",
      },
    },
    {
      id: "webos-2025",
      label: "2025 — webOS 25 (latest)",
      year: 2025,
      browser: {
        name: "LG Browser (Chromium 120)",
        chromiumVersion: "120",
        notes: "Based on current webOS TV 25 developer compatibility references; verify via device UA",
        launchKey: "chromium-120",
      },
    },
  ],
};
