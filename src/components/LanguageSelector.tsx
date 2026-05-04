import React, { useState, useEffect } from "react";
import { Languages, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { name: "English", code: "en" },
  { name: "Hindi (हिन्दी)", code: "hi" },
  { name: "Bengali (বাংলা)", code: "bn" },
  { name: "Telugu (తెలుగు)", code: "te" },
  { name: "Marathi (मराठी)", code: "mr" },
  { name: "Tamil (தமிழ்)", code: "ta" },
  { name: "Gujarati (ગુજરાતી)", code: "gu" },
  { name: "Kannada (ಕನ್ನಡ)", code: "kn" },
  { name: "Malayalam (മലയാളം)", code: "ml" },
  { name: "Punjabi (ਪੰਜਾਬੀ)", code: "pa" },
];

const LanguageSelector: React.FC = () => {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    // Check if there's already a saved language preference
    const googtrans = document.cookie.split("; ").find((row) => row.startsWith("googtrans="));
    if (googtrans) {
      const lang = googtrans.split("/").pop();
      if (lang) setCurrentLang(lang);
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    // Google Translate uses a cookie named 'googtrans' to determine the language
    // Format: /original_lang/target_lang
    const domain = window.location.hostname === "localhost" ? "" : `.${window.location.hostname}`;
    
    // Clear existing cookie first to be safe
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;

    if (langCode === "en") {
      // For English, we just clear the cookie
      setCurrentLang("en");
    } else {
      const cookieValue = `/en/${langCode}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      if (domain) {
        document.cookie = `googtrans=${cookieValue}; path=/; domain=${domain}`;
      }
      setCurrentLang(langCode);
    }
    
    // Refresh to apply changes
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-background/80 backdrop-blur-md border-border shadow-lg rounded-full px-4 h-11 flex items-center gap-2 hover:bg-primary/10 transition-all border-2"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Languages className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-xs hidden sm:inline">
              {languages.find(l => l.code === currentLang)?.name || "Language"}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 rounded-2xl p-2 bg-card border-border shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="px-2 py-1.5 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Select Language</p>
          </div>
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="rounded-xl flex items-center justify-between cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
            >
              <span className={currentLang === lang.code ? "font-bold text-primary" : ""}>
                {lang.name}
              </span>
              {currentLang === lang.code && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Hidden container for Google Translate element */}
      <div id="google_translate_element" className="hidden"></div>
    </div>
  );
};

export default LanguageSelector;
