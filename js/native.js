/**
 * Optional Capacitor bridge for iOS TestFlight builds.
 * Uses Capacitor.Plugins (no bundler required for static www/).
 * Safe no-ops when running as plain web.
 */

function plugins() {
  return window.Capacitor?.Plugins || {};
}

export function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform?.());
  } catch {
    return false;
  }
}

export async function initNative() {
  if (!window.Capacitor) return false;
  try {
    const p = plugins();
    if (isNative()) {
      document.documentElement.classList.add("is-native");
      document.body.classList.add("is-native");

      // Status bar
      try {
        await p.StatusBar?.setStyle?.({ style: "DARK" });
        await p.StatusBar?.setBackgroundColor?.({ color: "#0c0a10" });
        await p.StatusBar?.hide?.();
      } catch {
        /* optional */
      }

      // Hide splash once web is ready
      try {
        await p.SplashScreen?.hide?.();
      } catch {
        /* optional */
      }
    }
    return isNative();
  } catch (err) {
    console.warn("native init skipped", err);
    return false;
  }
}

export async function hapticLight() {
  try {
    await plugins().Haptics?.impact?.({ style: "LIGHT" });
  } catch {
    /* ignore */
  }
}

export async function hapticMedium() {
  try {
    await plugins().Haptics?.impact?.({ style: "MEDIUM" });
  } catch {
    /* ignore */
  }
}

export async function hapticHeavy() {
  try {
    await plugins().Haptics?.impact?.({ style: "HEAVY" });
  } catch {
    /* ignore */
  }
}

export async function hapticSuccess() {
  try {
    await plugins().Haptics?.notification?.({ type: "SUCCESS" });
  } catch {
    /* ignore */
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function shareDeathCard({ title, text, blob, filename = "ember-dash.png" }) {
  if (!blob) {
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
    return false;
  }

  const file = new File([blob], filename, { type: blob.type || "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return true;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return false;
  }

  try {
    const p = plugins();
    if (p.Filesystem?.writeFile && p.Share?.share) {
      const data = await blobToBase64(blob);
      const written = await p.Filesystem.writeFile({
        path: filename,
        data,
        directory: "CACHE",
      });
      await p.Share.share({
        title,
        text,
        files: written.uri ? [written.uri] : undefined,
        dialogTitle: title,
      });
      return true;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return false;
  }

  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return false;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export function onAppState(callback) {
  const App = plugins().App;
  if (!App?.addListener) return () => {};
  let handle = null;
  App.addListener("appStateChange", ({ isActive }) => {
    callback(!!isActive);
  }).then((h) => {
    handle = h;
  });
  return () => {
    try {
      handle?.remove?.();
    } catch {
      /* ignore */
    }
  };
}
