#!/usr/bin/env node

/**
 * Postinstall script for @rajoni/notification-service-sdk
 * Automatically copies Service Worker files to the customer's public directory.
 * 
 * Supports: Vite, CRA, Next.js (pages & app router), plain static projects.
 */

const fs = require("fs");
const path = require("path");

// ─── Possible public directory candidates (in priority order) ─────────────────
const PUBLIC_DIR_CANDIDATES = [
    "public",        // Vite, CRA, Next.js (pages router)
    "static",        // plain static sites
    "dist",          // some custom setups
    "app/public",    // Laravel Mix
];

// ─── Files to copy ────────────────────────────────────────────────────────────
const SW_FILES = [
    "firebase-messaging-sw.js",
    "OneSignalSDKWorker.js",
];

// ─── Find root of the host project ───────────────────────────────────────────
// When this runs via postinstall, __dirname is inside node_modules/@rajoni/...
// We need to walk up to the actual project root (where package.json lives).
function findProjectRoot() {
    // Walk up from node_modules/@rajoni/notification-service-sdk
    let dir = __dirname;
    for (let i = 0; i < 5; i++) {
        dir = path.dirname(dir);
        if (fs.existsSync(path.join(dir, "package.json"))) {
            // Make sure this is not our own package.json
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
                if (pkg.name !== "@rajoni/notification-service-sdk") {
                    return dir;
                }
            } catch (_) { }
        }
    }
    return null;
}

function findPublicDir(projectRoot) {
    for (const candidate of PUBLIC_DIR_CANDIDATES) {
        const full = path.join(projectRoot, candidate);
        if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
            return full;
        }
    }
    return null;
}

function run() {
    const projectRoot = findProjectRoot();

    if (!projectRoot) {
        console.warn(
            "[notification-service-sdk] Could not detect project root. " +
            "Please manually copy firebase-messaging-sw.js and OneSignalSDKWorker.js to your public folder."
        );
        return;
    }

    const publicDir = findPublicDir(projectRoot);

    if (!publicDir) {
        // Create a public/ folder as fallback
        const fallback = path.join(projectRoot, "public");
        try {
            fs.mkdirSync(fallback, { recursive: true });
            copyFiles(fallback);
        } catch (_) {
            console.warn(
                "[notification-service-sdk] No public folder found and could not create one. " +
                "Please manually copy firebase-messaging-sw.js and OneSignalSDKWorker.js to your public folder."
            );
        }
        return;
    }

    copyFiles(publicDir);
}

function copyFiles(targetDir) {
    let allCopied = true;

    for (const file of SW_FILES) {
        const src = path.join(__dirname, file);
        const dest = path.join(targetDir, file);

        if (!fs.existsSync(src)) {
            console.warn(`[notification-service-sdk] Source file not found: ${file}`);
            allCopied = false;
            continue;
        }

        // Skip if already exists with same content (idempotent)
        if (fs.existsSync(dest)) {
            const srcContent = fs.readFileSync(src, "utf8");
            const destContent = fs.readFileSync(dest, "utf8");
            if (srcContent === destContent) {
                continue; // already up to date, no noise
            }
        }

        try {
            fs.copyFileSync(src, dest);
        } catch (err) {
            console.error(`[notification-service-sdk] Failed to copy ${file}: ${err.message}`);
            allCopied = false;
        }
    }

    if (allCopied) {
        console.log(
            `[notification-service-sdk] ✓ Service worker files installed → ${path.relative(process.cwd(), targetDir)}/`
        );
    }
}

run();