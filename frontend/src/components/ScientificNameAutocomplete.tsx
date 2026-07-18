"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export interface DictionaryMedicine {
  id?: string;
  genericName: string;
  tradeName: string;
  category?: string | null;
  barcode?: string | null;
}

interface ScientificNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectMedicine?: (medicine: DictionaryMedicine) => void;
  error?: string;
  disabled?: boolean;
}

export default function ScientificNameAutocomplete({
  value,
  onChange,
  onSelectMedicine,
  error,
  disabled,
}: ScientificNameAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DictionaryMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce logic
  const [debouncedValue, setDebouncedValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectedRef = useRef(false);

  // Update debounced value after 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  // Fetch results when debounced value changes
  useEffect(() => {
    const fetchResults = async () => {
      // Don't search if less than 2 characters
      if (!debouncedValue || debouncedValue.length < 2) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.get(`/medicines/dictionary/search?q=${encodeURIComponent(debouncedValue)}`);
        // apiClient returns the JSON response directly, so res is { success: true, data: [...] }
        if (res.success && res.data) {
          setOptions(res.data);
          // Only open if we have results and it wasn't just selected
          if (res.data.length > 0 && !isSelectedRef.current) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dictionary options:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: DictionaryMedicine) => {
    isSelectedRef.current = true;
    onChange(option.genericName);
    if (onSelectMedicine) {
      onSelectMedicine(option);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" dir="rtl" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            isSelectedRef.current = false;
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (options.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          placeholder="ابحث عن الاسم العلمي (مثال: Paracetamol)"
          className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
            error ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && options.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((option, index) => (
            <li
              key={index}
              onClick={() => handleSelect(option)}
              className="px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors text-start"
            >
              <div className="font-semibold text-slate-800 dark:text-slate-100">{option.genericName}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{option.tradeName}</span>
                {option.category && <span>• {option.category}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
