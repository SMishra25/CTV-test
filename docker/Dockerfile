# Runs any historical Chromium / Chrome for Testing build headfully on a virtual
# X display, exposed over the web via noVNC. Old engines that segfault on modern
# macOS run cleanly here because the OS userland is fixed inside the container.
#
# Force amd64: historical Chromium snapshots only exist for Linux x86_64.
FROM --platform=linux/amd64 node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb \
      x11-utils \
      x11vnc \
      fluxbox \
      novnc \
      websockify \
      ca-certificates \
      fonts-liberation \
      curl \
      socat \
      unzip \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxrender1 \
      libxtst6 \
      libxkbcommon0 \
      libxshmfence1 \
      libgconf-2-4 \
      libxss1 \
      libappindicator3-1 \
      libu2f-udev \
      libvulkan1 \
      libjpeg62-turbo \
      libpng16-16 \
      libgtk2.0-0 \
      libpangocairo-1.0-0 \
      libcairo-gobject2 \
      libgdk-pixbuf2.0-0 \
      libexpat1 \
      libfontconfig1 \
      libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/runner
COPY package.json ./
RUN npm install --omit=dev

COPY resolve-and-launch.mjs ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Browser binaries are cached in a volume so each exact version downloads once.
ENV BROWSER_CACHE_DIR=/cache \
    DISPLAY=:99 \
    SCREEN_GEOMETRY=1920x1080x24 \
    NOVNC_PORT=7900 \
    VNC_PORT=5900

EXPOSE 7900
ENTRYPOINT ["./entrypoint.sh"]
