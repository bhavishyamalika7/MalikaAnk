import { motion, AnimatePresence } from "motion/react";
import { 
  Crown, 
  Calendar, 
  History, 
  ChevronRight, 
  Clock, 
  ArrowRight, 
  Info, 
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Palette,
  Globe,
  MapPin,
  Flame,
  Milestone
} from "lucide-react";
import { useState, useMemo } from "react";
import { 
  Body, 
  SearchMoonPhase, 
  SearchSunLongitude, 
  AstroTime
} from 'astronomy-engine';
import { KINGS, King, HISTORICAL_EVENTS } from "./constants";

/**
 * Anka Rule (Refined based on User input):
 * 1. Starts at 2. 1 is skipped.
 * 2. 6 is skipped.
 * 3. Numbers ending in 0 and 6 are skipped, EXCLUDING 10.
 * 4. Omitted years: 1, 6, 16, 20, 26, 30, 36, 40, 46...
 * 5. The Anka changes on Sunia (Bhadrapada Shukla Dwadashi).
 */
const isOmitted = (anka: number) => {
  if (anka === 1 || anka === 6) return true;
  if (anka === 10) return false;
  const lastDigit = anka % 10;
  return lastDigit === 0 || lastDigit === 6;
};

const getAnkaForYear = (coronationDate: Date, targetYear: number) => {
  const coronationYear = coronationDate.getFullYear();
  let currentAnka = 2; // Regnal Year 1 is Anka 2
  
  for (let y = coronationYear; y < targetYear; y++) {
    currentAnka++;
    while (isOmitted(currentAnka)) {
      currentAnka++;
    }
  }
  return currentAnka;
};

/**
 * Bhadrapada Shukla Dwadashi (Sunia) Calculation.
 * Bhadrapada is the lunar month where the Sun is in Sidereal Leo (120° - 150°).
 * In Tropical coordinates, this starts around 144.5 degrees.
 */
const getSuniaDate = (year: number) => {
  try {
    // Nirayana Simha Sankranti (Sidereal Leo entry) is approx Aug 16-17.
    // In Tropical longitudes, this is roughly 144.5 degrees.
    const searchStart = new AstroTime(new Date(year, 7, 5)); // Start Aug 5
    const simhaMoment = SearchSunLongitude(144.5, searchStart, 30);
    
    // Find the next new moon after Simha Sankranti
    const startForMoon = simhaMoment || new AstroTime(new Date(year, 7, 16));
    const newMoon = SearchMoonPhase(0, startForMoon, 32);
    
    if (!newMoon) return new Date(year, 8, 15);

    // Find the 12th Tithi (Shukla Dwadashi) = 132 degrees from New Moon
    const dwadashi = SearchMoonPhase(132, newMoon, 15);
    
    return dwadashi ? dwadashi.date : new Date(year, 8, 23);
  } catch (e) {
    console.error("Sunia calculation failed:", e);
    return new Date(year, 8, 15);
  }
};

/**
 * Chaitra Shukla Pratipada (Saka New Year) Calculation.
 * Chaitra starts with the New Moon before Sidereal Aries entry (Mesha Sankranti).
 * Mesha Sankranti is around April 14 (Tropical sun longitude ~24.5°).
 */
const getSakaNewYearDate = (year: number) => {
  try {
    const marchStart = new AstroTime(new Date(year, 2, 15));
    const meshaMoment = SearchSunLongitude(24.5, marchStart, 40);
    
    const startForMoon = meshaMoment || new AstroTime(new Date(year, 3, 14));
    const newMoonBefore = SearchMoonPhase(0, startForMoon, -35); // Search backwards
    
    return newMoonBefore ? newMoonBefore.date : new Date(year, 2, 22);
  } catch (e) {
    console.error("Saka New Year calculation failed:", e);
    return new Date(year, 2, 22);
  }
};

export default function App() {
  const [mode, setMode] = useState<"standard" | "custom">("standard");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Standard State
  const [selectedKingIndex, setSelectedKingIndex] = useState(KINGS.length - 1);
  const selectedKing = KINGS[selectedKingIndex];
  
  // Custom State
  const [customKingName, setCustomKingName] = useState("");
  const [customAscensionYear, setCustomAscensionYear] = useState<number | "">("");

  // Date State
  const [selectedDay, setSelectedDay] = useState<number | "">(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number | "">(new Date().getFullYear());

  const effectiveAscensionYear = mode === "standard" 
    ? new Date(selectedKing.ascensionDate).getFullYear()
    : (typeof customAscensionYear === "number" ? customAscensionYear : new Date().getFullYear());

  const minYear = effectiveAscensionYear;

  const maxYear = mode === "standard"
    ? (selectedKing.reignEnd ? new Date(selectedKing.reignEnd).getFullYear() : new Date().getFullYear() + 50)
    : effectiveAscensionYear + 100;

  const handleKingChange = (idx: number) => {
    setSelectedKingIndex(idx);
    const king = KINGS[idx];
    const ascDate = new Date(king.ascensionDate);
    setSelectedYear(ascDate.getFullYear());
    setSelectedMonth(ascDate.getMonth());
    setSelectedDay(ascDate.getDate());
  };

  const results = useMemo(() => {
    const coronationYear = effectiveAscensionYear;
      
    const currentYearVal = selectedYear === "" ? new Date().getFullYear() : selectedYear;
    const currentDayVal = selectedDay === "" ? 1 : selectedDay;

    const year = Math.max(minYear, Math.min(maxYear, currentYearVal));
    const targetDate = new Date(year, selectedMonth, currentDayVal);
    const suniaThisYear = getSuniaDate(year);

    const conceptuallyAfterSunia = targetDate >= suniaThisYear;
    const calculationEffectiveYear = conceptuallyAfterSunia ? year : year - 1;

    const regnalYear = calculationEffectiveYear - coronationYear + 1;
    const currentAnka = getAnkaForYear(new Date(coronationYear, 0, 1), calculationEffectiveYear);
    const nextAnka = getAnkaForYear(new Date(coronationYear, 0, 1), calculationEffectiveYear + 1);

    // Saka Year Transition based on Chaitra Shukla Pratipada
    const sakaTransitionDate = getSakaNewYearDate(year);
    const selectedDateForSaka = new Date(year, selectedMonth, currentDayVal);
    const sakaYear = selectedDateForSaka >= sakaTransitionDate 
      ? year - 78 
      : year - 79;

    const utkalabdh = calculationEffectiveYear - 592;

    const startDate = getSuniaDate(calculationEffectiveYear);
    const endDate = getSuniaDate(calculationEffectiveYear + 1);

    return {
      regnalYear,
      currentAnka,
      nextAnka,
      sakaYear,
      utkalabdh,
      startDate: startDate.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      endDate: endDate.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }, [mode, selectedKingIndex, effectiveAscensionYear, selectedYear, selectedMonth, selectedDay, minYear, maxYear]);

  const yearEvents = useMemo(() => {
    return HISTORICAL_EVENTS.filter(e => e.year === selectedYear);
  }, [selectedYear]);

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans selection:bg-[#C5A059] selection:text-white pb-20 relative overflow-hidden ${
      theme === "dark" ? "bg-[#0F0D0A] text-[#E0D8D0]" : "bg-[#FDFBF7] text-[#3E362E]"
    }`}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-pulse transition-opacity duration-1000 ${
          theme === "dark" ? "bg-[#C5A059]/10 opacity-100" : "bg-[#C5A059]/30 opacity-70"
        }`} />
        <div className={`absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] transition-opacity duration-1000 ${
          theme === "dark" ? "bg-[#3E362E]/30 opacity-100" : "bg-[#E5D5C0]/40 opacity-70"
        }`} />
      </div>

      {/* Theme Toggle & Header Combined */}
      <header className="relative z-20 pt-12 pb-6 px-6 text-center">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            className={`p-3 rounded-2xl backdrop-blur-xl border transition-all duration-500 shadow-xl flex items-center gap-2 group ${
              theme === "dark" ? "bg-white/5 border-white/10 text-[#C5A059]" : "bg-black/5 border-black/10 text-[#8B7E66]"
            }`}
          >
            {theme === "dark" ? <Sun className="w-5 h-5 group-hover:rotate-90 transition-transform" /> : <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />}
            <span className="text-xs font-black uppercase tracking-widest hidden md:inline">थीम</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
        >
          <div className="flex justify-center mb-4">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className={`p-4 rounded-2xl border backdrop-blur-xl shadow-lg transition-colors duration-500 ${
                theme === "dark" ? "bg-[#C5A059]/10 border-[#C5A059]/20" : "bg-[#C5A059]/5 border-[#C5A059]/10"
              }`}
            >
              <Crown className="w-10 h-10 text-[#C5A059]" />
            </motion.div>
          </div>
          <h1 className={`text-5xl md:text-6xl font-serif font-bold tracking-tight mb-2 drop-shadow-sm transition-colors duration-500 ${
            theme === "dark" ? "text-white" : "text-[#3E362E]"
          }`}>
            गजपति अंक कैलकुलेटर
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className={`h-[1px] w-10 transition-colors duration-500 ${theme === "dark" ? "bg-[#C5A059]/30" : "bg-[#C5A059]/20"}`} />
            <p className="text-[#C5A059] font-black uppercase text-xs tracking-[0.3em]">
              ROYAL ANKA SYSTEM
            </p>
            <div className={`h-[1px] w-10 transition-colors duration-500 ${theme === "dark" ? "bg-[#C5A059]/30" : "bg-[#C5A059]/20"}`} />
          </div>
        </motion.div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 space-y-6">
        
        {/* Compact Navigation Tabs */}
        <div className={`flex p-2 rounded-2xl max-w-sm mx-auto backdrop-blur-2xl border transition-all duration-500 shadow-xl ${
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
        }`}>
          <button
            onClick={() => setMode("standard")}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-500 ${
              mode === "standard" 
                ? "bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white shadow-lg" 
                : theme === "dark" ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"
            }`}
          >
            राजवंश
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-500 ${
              mode === "custom" 
                ? "bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white shadow-lg" 
                : theme === "dark" ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"
            }`}
          >
            कस्टम
          </button>
        </div>

        {/* Compact Selection Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="wait">
            {mode === "standard" ? (
              <motion.div
                key="standard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`rounded-[2rem] p-8 backdrop-blur-3xl border transition-all duration-500 shadow-xl group overflow-hidden ${
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                }`}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-[#C5A059]/20" : "bg-[#C5A059]/10"}`}>
                      <History className="w-5 h-5 text-[#C5A059]" />
                    </div>
                    <label className={`font-black uppercase tracking-widest text-xs ${theme === "dark" ? "text-[#C5A059]" : "text-[#8B7E66]"}`}>महाराज का चयन</label>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedKingIndex}
                      onChange={(e) => handleKingChange(Number(e.target.value))}
                      className={`w-full py-4 bg-transparent border-b-2 transition-all focus:outline-none text-2xl font-serif font-bold appearance-none cursor-pointer ${
                        theme === "dark" ? "text-white border-white/10 focus:border-[#C5A059]" : "text-[#3E362E] border-black/10 focus:border-[#C5A059]"
                      }`}
                    >
                      {KINGS.map((king, idx) => (
                        <option key={`${king.name}-${idx}`} value={idx} className={theme === "dark" ? "bg-[#1A1815] text-white" : "bg-white text-black"}>
                          {idx + 1}. {king.nameHi}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 w-6 h-6 opacity-30" />
                  </div>

                  {/* King's History Display */}
                  {selectedKing.historyHi && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`mt-6 p-4 rounded-xl border-l-4 border-[#C5A059] ${theme === "dark" ? "bg-[#C5A059]/5 border-[#C5A059]/30" : "bg-[#C5A059]/5 border-[#C5A059]/20"}`}
                    >
                      <p className={`text-xs leading-relaxed font-medium ${theme === "dark" ? "text-white/70" : "text-[#3E362E]/80"}`}>
                        {selectedKing.historyHi}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`rounded-[2rem] p-8 backdrop-blur-3xl border transition-all duration-500 shadow-xl space-y-6 ${
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                }`}
              >
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className={`block font-black uppercase tracking-widest text-xs mb-3 ${theme === "dark" ? "text-[#C5A059]" : "text-[#8B7E66]"}`}>राजा का नाम</label>
                    <input
                      type="text"
                      value={customKingName}
                      onChange={(e) => setCustomKingName(e.target.value)}
                      placeholder="नाम लिखें..."
                      className={`w-full p-4 rounded-xl border focus:outline-none transition-all text-base font-bold ${
                        theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-[#C5A059]/40" : "bg-black/5 border-black/10 text-black placeholder:text-black/20 focus:border-[#C5A059]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block font-black uppercase tracking-widest text-xs mb-3 ${theme === "dark" ? "text-[#C5A059]" : "text-[#8B7E66]"}`}>अभिषेक वर्ष</label>
                    <input
                      type="number"
                      value={customAscensionYear}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setCustomAscensionYear(val);
                        if (typeof val === "number") setSelectedYear(val);
                      }}
                      placeholder="YYYY"
                      className={`w-full p-4 rounded-xl border focus:outline-none transition-all text-base font-bold text-center ${
                        theme === "dark" ? "bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-[#C5A059]/40" : "bg-black/5 border-black/10 text-black placeholder:text-black/20 focus:border-[#C5A059]"
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Date Picker */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-[2rem] p-8 backdrop-blur-3xl border transition-all duration-500 shadow-xl group ${
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-[#C5A059]/20" : "bg-[#C5A059]/10"}`}>
                <Calendar className="w-5 h-5 text-[#C5A059]" />
              </div>
              <label className={`font-black uppercase tracking-widest text-sm ${theme === "dark" ? "text-[#C5A059]" : "text-[#8B7E66]"}`}>गणना तिथि</label>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => {
                    const d = selectedDay === "" ? new Date().getDate() : Number(selectedDay);
                    setSelectedDay(Math.max(1, Math.min(31, d)));
                  }}
                  min={1}
                  max={31}
                  className={`p-4 rounded-xl border transition-all font-bold text-base text-center ${
                    theme === "dark" ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]/40" : "bg-black/5 border-black/10 text-black focus:border-[#C5A059]/50"
                  }`}
                />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className={`p-4 rounded-xl border appearance-none transition-all font-bold text-base text-center ${
                    theme === "dark" ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]/40" : "bg-black/5 border-black/10 text-black focus:border-[#C5A059]/50"
                  }`}
                >
                  {["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"].map((m, idx) => (
                    <option key={`${m}-${idx}`} value={idx} className={theme === "dark" ? "bg-[#1A1815] text-white" : "bg-white text-black"}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => {
                    let y = selectedYear === "" ? new Date().getFullYear() : Number(selectedYear);
                    if (y < 1568) y = 1568;
                    if (y > 2200) y = 2200;
                    setSelectedYear(y);
                  }}
                  min={1568}
                  max={2200}
                  className={`p-4 rounded-xl border transition-all font-bold text-base text-center ${
                    theme === "dark" ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]/40" : "bg-black/5 border-black/10 text-black focus:border-[#C5A059]/50"
                  }`}
                />
              </div>

              {/* Year Navigation Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedYear(y => Math.max(minYear, y - 1))}
                  disabled={selectedYear <= minYear}
                  className={`flex-1 py-3 rounded-xl border transition-all font-bold text-xs uppercase tracking-widest shadow-md ${
                    theme === "dark" 
                      ? "bg-white/5 border-white/10 text-[#C5A059] hover:bg-[#C5A059] hover:text-white" 
                      : "bg-white border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                  } disabled:opacity-30`}
                >
                  -1 वर्ष
                </button>
                <button 
                  onClick={() => setSelectedYear(y => Math.min(maxYear, y + 1))}
                  disabled={selectedYear >= maxYear}
                  className={`flex-1 py-3 rounded-xl border transition-all font-bold text-xs uppercase tracking-widest shadow-md ${
                    theme === "dark" 
                      ? "bg-white/5 border-white/10 text-[#C5A059] hover:bg-[#C5A059] hover:text-white" 
                      : "bg-white border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                  } disabled:opacity-30`}
                >
                  +1 वर्ष
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Results with Refined Sizing */}
        <AnimatePresence mode="wait">
          {results && (
            <motion.div
              key={`${results.currentAnka}-${selectedYear}-${selectedMonth}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Regnal Box Carded */}
              <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 shadow-xl relative overflow-hidden group ${
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
              }`}>
                <div className="relative z-10">
                  <label className="text-[#C5A059] font-black uppercase tracking-widest text-sm mb-8 block">शासन वर्ष</label>
                  <div className="text-7xl font-serif font-black mb-2 flex items-baseline gap-3">
                    {results.regnalYear}
                    <span className="text-base uppercase font-bold opacity-30 tracking-widest">वर्षी</span>
                  </div>
                </div>
              </div>

              {/* Major Anka Hero */}
              <div className="bg-gradient-to-br from-[#3E362E] to-[#1A1815] rounded-[2.5rem] p-8 border-b-8 border-[#C5A059] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Sparkles className="w-20 h-20 text-[#C5A059]" />
                </div>
                <div className="relative z-10">
                  <label className="text-[#C5A059] font-black uppercase tracking-widest text-sm mb-8 block">अंक वर्ष</label>
                  <div className="text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
                    {results.currentAnka}
                  </div>
                </div>
                <div className="relative z-10 pt-6 border-t border-white/5 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#C5A059] animate-pulse shadow-[0_0_10px_#C5A059]" />
                  <span className="text-sm font-black uppercase tracking-widest text-[#C5A059]">अगला अंक: {results.nextAnka}</span>
                </div>
              </div>

              {/* Eras Stack - Saka & Utkalabdh */}
              <div className="space-y-6">
                <div className={`p-6 rounded-[2rem] border transition-all duration-500 flex justify-between items-center shadow-xl ${
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                }`}>
                  <div>
                    <label className="text-[#C5A059] text-sm font-black uppercase mb-2 block tracking-widest">शक संवत</label>
                    <span className="text-3xl font-bold font-serif">{results.sakaYear}</span>
                  </div>
                </div>
                <div className={`p-6 rounded-[2rem] border transition-all duration-500 flex justify-between items-center shadow-xl ${
                  theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                }`}>
                  <div>
                    <label className="text-[#8B7E66] text-sm font-black uppercase mb-2 block tracking-widest">उत्कलाब्द</label>
                    <span className="text-3xl font-bold font-serif">{results.utkalabdh}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Timeline Card */}
              <div className={`md:col-span-3 p-8 rounded-[3rem] border transition-all duration-500 overflow-hidden relative group shadow-2xl ${
                theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-black/5"
              }`}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/5 via-transparent to-transparent opacity-50" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-[#C5A059]/10" : "bg-[#C5A059]/5"} text-[#C5A059]`}>
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest mb-2">अंक अवधि (Sunia Cycle)</h3>
                      <p className="text-xl font-serif font-bold opacity-60 tracking-wider">{results.startDate} — {results.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-5 py-2 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-xs font-black uppercase tracking-widest">
                      भाद्रपद शुक्ल द्वादशी (सुनिया)
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Historical Events Section */}
        {yearEvents.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-10 rounded-[3.5rem] border transition-all duration-500 shadow-2xl relative overflow-hidden ${
              theme === "dark" ? "bg-[#C5A059]/5 border-[#C5A059]/20" : "bg-[#C5A059]/5 border-[#C5A059]/10"
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <Globe className="w-8 h-8 text-[#C5A059]" />
                <h3 className="text-2xl font-serif font-bold tracking-tight">वर्ष {selectedYear} की प्रमुख घटनाएँ</h3>
              </div>
              <div className="space-y-8">
                {yearEvents.map((event, i) => (
                  <div key={i} className="flex gap-6 items-start group">
                    <div className={`mt-2 p-2 rounded-xl shrink-0 transition-colors ${
                      event.category === "Temple" ? "bg-[#D4AF37] text-white" : 
                      event.category === "Odisha" ? "bg-[#3E362E] text-white" :
                      "bg-[#C5A059]/20 text-[#C5A059]"
                    }`}>
                      {event.category === "Temple" ? <MapPin className="w-5 h-5" /> : 
                       event.category === "World" ? <Globe className="w-5 h-5" /> : 
                       <Milestone className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-lg font-bold leading-relaxed transition-colors ${theme === "dark" ? "text-white/90" : "text-[#3E362E]"}`}>
                        {event.eventHi}
                      </p>
                      {event.descriptionHi && (
                        <p className={`mt-2 text-sm leading-relaxed ${theme === "dark" ? "text-white/50" : "text-[#3E362E]/60"} font-medium`}>
                          {event.descriptionHi}
                        </p>
                      )}
                      <span className="text-xs font-black uppercase tracking-widest opacity-40 mt-3 block italic">
                        श्रेणी: {event.category === "Temple" ? "श्री जगन्नाथ मंदिर" : 
                               event.category === "Odisha" ? "ओडिशा" : 
                               event.category === "India" ? "भारत" : "विश्व"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Principles Summary */}
        <section className={`p-10 rounded-[3rem] border transition-all duration-500 relative overflow-hidden shadow-xl ${
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
        }`}>
          <div className="flex items-center gap-4 mb-8">
            <Info className="w-6 h-6 text-[#C5A059]" />
            <h4 className="text-lg font-black uppercase tracking-widest">गणना सिद्धांत</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              "अंक प्रणाली 2 से प्रारंभ होती है।",
              "6 और 0 पर समाप्त होने वाले अंक वर्जित हैं (10 अपवाद है)।",
              "परिवर्तन सुनिया तिथि को होता है।",
              "शक संवत चैत्र शुक्ल प्रतिपदा को बदलता है।"
            ].map((text, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <div className="w-2 h-2 rounded-full bg-[#C5A059] opacity-100 shadow-[0_0_10px_#C5A059]" />
                <p className={`text-sm font-bold tracking-wide transition-colors ${theme === "dark" ? "text-white/40 group-hover:text-white/70" : "text-black/40 group-hover:text-black/60"}`}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="pt-12 pb-6 text-center">
          <p className="text-xs font-black uppercase mb-2 opacity-30">
            © {new Date().getFullYear()} पुरी गजपति राजवंश संचिका
          </p>
          <p className="text-xs font-bold text-[#8B7E66]">
            किसी भी समस्या के लिए संपर्क करें: 
            <a 
              href="mailto:bhavishyamalika7@gmail.com" 
              className="ml-2 text-[#C5A059] hover:underline font-semibold"
            >
              bhavishyamalika7@gmail.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}


