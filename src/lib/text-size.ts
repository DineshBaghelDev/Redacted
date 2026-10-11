const KEY = "redacted.largeText";

/** Larger reading text scales the whole interface (sizes are in rem), remembered per browser. */
export function isLargeText() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function applyTextSize(large = isLargeText()) {
  document.documentElement.style.fontSize = large ? "112.5%" : "";
}

export function setLargeText(large: boolean) {
  try {
    window.localStorage.setItem(KEY, large ? "1" : "0");
  } catch {
    // Without storage the setting lasts for this visit only.
  }
  applyTextSize(large);
}
