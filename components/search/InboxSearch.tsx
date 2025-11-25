"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { SearchSuggestion } from "@/lib/schema/suggestion.schema";

interface InboxSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
}

export function InboxSearch({
  value,
  onChange,
  placeholder = "Search inbox items... (try @project, @org, @repo, @status, @assignee, @type)",
  suggestions = [],
}: InboxSearchProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the current search query to detect filter triggers
  useEffect(() => {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(" ");
      
      if (!hasSpace) {
        // Extract filter type and partial text
        const match = textAfterAt.match(/^(\w+):?(.*)$/);
        if (match) {
          const [, filterType, partialValue] = match;
          
          // Filter suggestions based on type and partial value
          const filtered = suggestions.filter((s) => {
            const typeMatches = s.type === filterType || (
              !["project", "org", "repo", "status", "assignee", "type"].includes(filterType) &&
              s.value.toLowerCase().startsWith(filterType.toLowerCase())
            );
            const valueMatches = !partialValue || 
              s.value.toLowerCase().includes(partialValue.toLowerCase()) ||
              s.label.toLowerCase().includes(partialValue.toLowerCase());
            
            return typeMatches && valueMatches;
          });
          
          setFilteredSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        } else {
          // Just @ typed, show all suggestions
          setFilteredSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    // Find the @ position to replace
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const beforeAt = value.slice(0, lastAtIndex);
      const filterText = `@${suggestion.type}:${suggestion.value}`;
      const newValue = beforeAt + filterText + " " + textAfterCursor.trim();
      
      onChange(newValue);
      setShowSuggestions(false);
      
      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = beforeAt.length + filterText.length + 1;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <Command>
            <CommandList>
              <CommandGroup heading="Suggestions">
                {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-muted-foreground mr-2">
                      @{suggestion.type}:
                    </span>
                    <span className="flex-1">{suggestion.label}</span>
                    {suggestion.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({suggestion.count})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
