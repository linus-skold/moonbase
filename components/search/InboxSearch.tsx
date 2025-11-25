'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface InboxSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InboxSearch({ 
  value, 
  onChange, 
  placeholder = "Search inbox items..." 
}: InboxSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
