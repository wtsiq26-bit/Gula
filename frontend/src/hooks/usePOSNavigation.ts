import { useEffect } from "react";

interface POSNavigationProps {
  onFocusSearch: () => void;
  onTriggerCheckout: () => void;
  onClearCart: () => void;
}

/**
 * A custom hook for POS keyboard-first navigation.
 * F4: Focus Search
 * F12: Trigger Checkout
 * Esc: Clear Cart Confirmation
 */
export function usePOSNavigation({ onFocusSearch, onTriggerCheckout, onClearCart }: POSNavigationProps) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        onFocusSearch();
      } else if (e.key === "F12") {
        e.preventDefault();
        onTriggerCheckout();
      } else if (e.key === "Escape") {
        // Only trigger clear cart if no modal is currently blocking
        // We'll trust the parent component to handle the logic
        onClearCart();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onFocusSearch, onTriggerCheckout, onClearCart]);
}
