// In-game screens all live in one client page, so switching between them only needs the URL to change.
// Next keeps usePathname in sync with the native history API, which skips the server round trip router.push makes.

export function go(path: string) {
  window.history.pushState(null, "", path);
}

export function replaceTo(path: string) {
  window.history.replaceState(null, "", path);
}
