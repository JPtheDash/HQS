import { defineConfig } from "vite";
import { readFileSync } from "fs";

// Mirrors the sibling Krishna project: the About box reads its version from
// the Android project rather than a hand-typed string, so the two can never
// drift apart. Falls back to "dev" until `android/` exists (e.g. before the
// first `npx cap add android`) or on a checkout that omits it.
function appVersion() {

    try {

        const gradle = readFileSync("android/app/build.gradle", "utf8");

        return /versionName\s+"([^"]+)"/.exec(gradle)[1];

    } catch {

        return "dev";

    }

}

// Testing happens on a phone/tablet reaching this Codespace through a
// forwarded hostname rather than localhost. Vite rejects an unrecognised
// Host header - the page comes back as "Blocked request" instead of the
// game, which looks exactly like a dead server. The leading dot matches any
// subdomain, so this keeps working when the Codespace is rebuilt under a
// different name.
const FORWARDED_HOSTS = [".app.github.dev", ".githubpreview.dev"];

const server = {
    host: true,
    port: 5173,
    allowedHosts: FORWARDED_HOSTS
};

export default defineConfig({
    server,
    preview: { ...server, port: 4173 },
    define: {
        __APP_VERSION__: JSON.stringify(appVersion())
    }
});
