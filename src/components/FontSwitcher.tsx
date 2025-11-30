import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Type } from 'lucide-react';

interface FontOption {
  name: string;
  value: string;
  className: string;
}

const fontOptions: FontOption[] = [
  { name: 'Inter', value: 'inter', className: 'font-sans' },
  { name: 'Poppins', value: 'poppins', className: 'font-display' },
  { name: 'Roboto', value: 'roboto', className: 'font-roboto' },
  { name: 'Montserrat', value: 'montserrat', className: 'font-montserrat' },
];

const FontSwitcher = () => {
  const [currentFont, setCurrentFont] = useState<string>('inter');

  useEffect(() => {
    // Load saved font preference
    const savedFont = localStorage.getItem('preferred-font') || 'inter';
    setCurrentFont(savedFont);
    applyFont(savedFont);
  }, []);

  const applyFont = (fontValue: string) => {
    const root = document.documentElement;
    const fontOption = fontOptions.find((f) => f.value === fontValue);

    if (fontOption) {
      // Update CSS variables
      switch (fontValue) {
        case 'inter':
          root.style.setProperty('--font-primary', 'Inter, system-ui, sans-serif');
          root.style.setProperty('--font-body', 'Inter, system-ui, sans-serif');
          break;
        case 'poppins':
          root.style.setProperty('--font-primary', 'Poppins, system-ui, sans-serif');
          root.style.setProperty('--font-body', 'Poppins, system-ui, sans-serif');
          break;
        case 'roboto':
          root.style.setProperty('--font-primary', 'Roboto, system-ui, sans-serif');
          root.style.setProperty('--font-body', 'Roboto, system-ui, sans-serif');
          break;
        case 'montserrat':
          root.style.setProperty('--font-primary', 'Montserrat, system-ui, sans-serif');
          root.style.setProperty('--font-body', 'Montserrat, system-ui, sans-serif');
          break;
      }
    }
  };

  const handleFontChange = (fontValue: string) => {
    setCurrentFont(fontValue);
    applyFont(fontValue);
    localStorage.setItem('preferred-font', fontValue);
  };

  const currentFontName = fontOptions.find((f) => f.value === currentFont)?.name || 'Inter';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Type className="h-4 w-4" />
          <span className="hidden sm:inline">{currentFontName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {fontOptions.map((font) => (
          <DropdownMenuItem
            key={font.value}
            onClick={() => handleFontChange(font.value)}
            className={`${font.className} ${currentFont === font.value ? 'bg-accent' : ''}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{font.name}</span>
              <span className="text-xs text-muted-foreground">The quick brown fox jumps</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FontSwitcher;
