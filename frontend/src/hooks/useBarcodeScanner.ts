import { useEffect } from "react";

/**
 * A custom hook that listens to fast sequential keystrokes globally
 * to detect barcode scanner input.
 * Scanners act like keyboards but type extremely fast (<50ms between keys)
 * and terminate with an 'Enter' key.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = 0;
    const SCAN_THRESHOLD = 50; // ms
    let scanTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

      if (e.key === "Enter" && barcodeBuffer.length >= 3) {
        // Prevent default form submissions if it was a scan
        e.preventDefault();
        e.stopPropagation();
        const finalBarcode = barcodeBuffer;
        barcodeBuffer = "";
        onScan(finalBarcode);
        return;
      }

      // Capture single character inputs
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (now - lastKeyTime < SCAN_THRESHOLD || barcodeBuffer.length === 0) {
          barcodeBuffer += e.key;
        } else {
          // If human typing, reset buffer unless they are NOT in an input
          barcodeBuffer = isInputFocused ? "" : e.key;
        }
        lastKeyTime = now;

        clearTimeout(scanTimer);
        scanTimer = setTimeout(() => {
          barcodeBuffer = "";
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      clearTimeout(scanTimer);
    };
  }, [onScan]);
}
