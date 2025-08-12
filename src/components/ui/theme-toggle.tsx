import { Moon, Sun, Monitor, PartyPopper } from "lucide-react"

import { Button } from "./button"
import { useTheme } from "../providers/ModernThemeProvider"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("fun")
    } else if (theme === "fun") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-[1.2rem] w-[1.2rem] text-sky-500" />
      case "dark":
        return <Moon className="h-[1.2rem] w-[1.2rem] text-blue-400" />
      case "fun":
        return <PartyPopper className="h-[1.2rem] w-[1.2rem] text-pink-500" />
      case "system":
        return <Monitor className="h-[1.2rem] w-[1.2rem] text-gray-500" />
      default:
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
    }
  }

  const getTooltipText = () => {
    switch (theme) {
      case "light":
        return "Switch to Dark Mode"
      case "dark":
        return "Switch to Fun Mode"
      case "fun":
        return "Switch to System Mode"
      case "system":
        return "Switch to Light Mode"
      default:
        return "Toggle theme"
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
      title={getTooltipText()}
    >
      {getThemeIcon()}
      <span className="sr-only">{getTooltipText()}</span>
    </Button>
  )
}
