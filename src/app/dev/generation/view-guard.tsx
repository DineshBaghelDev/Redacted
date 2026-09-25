"use client";

import { Component, type ReactNode } from "react";

/** Shows a note instead of crashing the page when a view gets output with the wrong shape. */
export class ViewGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p className="text-xs text-red-400">Can&apos;t draw this output. See the problems and raw data.</p>;
    return this.props.children;
  }
}
