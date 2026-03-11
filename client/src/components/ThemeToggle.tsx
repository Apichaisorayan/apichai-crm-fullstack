import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full"
      title={theme === "light" ? "เปลี่ยนเป็นโหมดกลางคืน" : "เปลี่ยนเป็นโหมดกลางวัน"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-[#4a4a4a]" />
      ) : (
        <Sun className="h-5 w-5 text-[#3dbdb8]" />
      )}
    </Button>
  );
}
