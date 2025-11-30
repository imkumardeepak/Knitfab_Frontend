import React from "react";
import { useTheme, type Theme } from "../contexts/ThemeContext";
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";

interface ThemeToggleProps {
  variant?: "button" | "dropdown";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "button",
  className = "",
}) => {
  const { theme, setTheme } = useTheme();

  if (variant === "dropdown") {
    return (
      <div className={`relative inline-block text-left ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="appearance-none bg-background border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg
            className="w-4 h-4 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon className="h-5 w-5" />;
      case "dark":
        return <MoonIcon className="h-5 w-5" />;
      case "system":
        return <ComputerDesktopIcon className="h-5 w-5" />;
      default:
        return <SunIcon className="h-5 w-5" />;
    }
  };

  const getNextTheme = (): Theme => {
    switch (theme) {
      case "light":
        return "dark";
      case "dark":
        return "system";
      case "system":
        return "light";
      default:
        return "light";
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light mode";
      case "dark":
        return "Dark mode";
      case "system":
        return "System theme";
      default:
        return "Light mode";
    }
  };

  return (
    <button
      onClick={() => setTheme(getNextTheme())}
      className={`
        inline-flex items-center justify-center
        p-2 rounded-md
        text-foreground hover:bg-secondary
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${className}
      `}
      title={`Current: ${getThemeLabel()}. Click to switch.`}
      aria-label={`Switch theme. Current: ${getThemeLabel()}`}
    >
      <span className="transform transition-transform duration-200 hover:scale-110">
        {getIcon()}
      </span>
    </button>
  );
};

// Alternative component with explicit theme options
export const ThemeSelector: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <SunIcon className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <MoonIcon className="h-4 w-4" /> },
    {
      value: "system",
      label: "System",
      icon: <ComputerDesktopIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className={`flex items-center space-x-1 p-1 bg-secondary rounded-lg ${className}`}
    >
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
            transition-all duration-200 ease-in-out
            ${
              theme === themeOption.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-background hover:text-foreground"
            }
          `}
          aria-label={`Switch to ${themeOption.label} theme`}
        >
          {themeOption.icon}
          <span className="hidden sm:inline">{themeOption.label}</span>
        </button>
      ))}
    </div>
  );
};
