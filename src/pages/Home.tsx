import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, AlertCircle, Droplets, Flame, ThermometerSun, Wind, CloudLightning, Info } from "lucide-react";
import { useGetClimateRisk } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "@/components/ui/gauge";
import { GlobeSelector } from "@/components/GlobeSelector";
import type { ClimateRiskResult } from "@/lib/api";

type ViewState = "search" | "loading" | "results" | "error";

const loadingPhrases = [
  "Querying federal climate databases...",
  "Analyzing historical weather patterns...",
  "Calculating property exposure...",
  "Finalizing risk assessment..."
];

export default function Home() {
  const [address, setAddress] = useState("");
  const [view, setView] = useState<ViewState>("search");
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);
  const [selectionReady, setSelectionReady] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [hasManualAddress, setHasManualAddress] = useState(false);

  const mutation = useGetClimateRisk();

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    if (!address.trim()) {
      return;
    }

    if (!selectionReady && !hasManualAddress) {
      setSelectionMessage("Click a land area on the globe to select a location before analyzing.");
      return;
    }

    setView("loading");
    setLoadingPhraseIdx(0);
    
    // Cycle loading phrases
    const interval = setInterval(() => {
      setLoadingPhraseIdx((i) => (i + 1) % loadingPhrases.length);
    }, 2000);

    mutation.mutate(
      { data: { address } },
      {
        onSuccess: () => {
          clearInterval(interval);
          setView("results");
        },
        onError: () => {
          clearInterval(interval);
          setView("error");
        },
      }
    );
  };

  const handleReset = () => {
    setView("search");
    setAddress("");
    setSelectionReady(false);
    setSelectionMessage(null);
    setHasManualAddress(false);
    mutation.reset();
  };

  const handleSelectionStatusChange = (state: { isValid: boolean; message: string | null; address: string | null }) => {
    setSelectionReady(state.isValid);
    setSelectionMessage(state.message);
    if (state.address) {
      setAddress(state.address);
      setHasManualAddress(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
      <AnimatePresence mode="wait">
        {view === "search" && (
          <SearcherView
            key="search"
            address={address}
            setAddress={setAddress}
            onSearch={handleSearch}
            selectionReady={selectionReady}
            selectionMessage={selectionMessage}
            onSelectionStatusChange={handleSelectionStatusChange}
            setHasManualAddress={setHasManualAddress}
          />
        )}
        {view === "loading" && (
          <LoadingView
            key="loading"
            address={address}
            phrase={loadingPhrases[loadingPhraseIdx]}
          />
        )}
        {view === "error" && (
          <ErrorView
            key="error"
            error={mutation.error?.error || "Failed to analyze property"}
            onRetry={() => handleSearch()}
            onReset={handleReset}
          />
        )}
        {view === "results" && mutation.data && (
          <ResultsView
            key="results"
            data={mutation.data}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SearcherView({
  address,
  setAddress,
  onSearch,
  selectionReady,
  selectionMessage,
  onSelectionStatusChange,
  setHasManualAddress,
}: {
  address: string;
  setAddress: (val: string) => void;
  onSearch: (e: FormEvent) => void;
  selectionReady: boolean;
  selectionMessage: string | null;
  onSelectionStatusChange: (state: { isValid: boolean; message: string | null; address: string | null }) => void;
  setHasManualAddress: (val: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex-1 flex flex-col items-center justify-start pt-8 pb-10 px-4 md:px-6"
    >
      <div className="w-full max-w-3xl space-y-6">
        {/* Wordmark + tagline */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Climate<span className="text-primary/70">IQ</span>
          </h1>
          <p className="text-base text-muted-foreground">
            Pin a location on the globe, or type an address below.
          </p>
        </div>

        {/* Interactive Globe */}
        <GlobeSelector
          onLocationSelect={setAddress}
          hasSelection={address.trim().length > 0}
          onSelectionStatusChange={onSelectionStatusChange}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground/50 select-none">
          <span className="flex-1 h-px bg-border" />
          <span className="shrink-0 uppercase tracking-widest font-medium">or enter address</span>
          <span className="flex-1 h-px bg-border" />
        </div>

        {/* Address form */}
        <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              placeholder="e.g. 1600 Pennsylvania Ave NW, Washington, DC"
              className="pl-10 h-14 text-base bg-secondary/50 border-secondary focus-visible:ring-primary/30 rounded-xl"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setHasManualAddress(e.target.value.trim().length > 0);
              }}
              data-testid="input-address"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 px-8 text-base rounded-xl font-medium"
            disabled={!address.trim() || (!selectionReady && !hasManualAddress)}
            data-testid="button-analyze"
          >
            Analyze Property
          </Button>
        </form>

        <p className="text-xs text-muted-foreground/50 text-center">
          {selectionMessage ?? (selectionReady ? "Location selected — ready to analyze." : "Click a land area on the globe to enable analysis.")}
        </p>
        <p className="text-xs text-muted-foreground/50 text-center">
          Powered by FEMA, NOAA, US Drought Monitor, and USDA Forest Service public datasets.
        </p>
      </div>
    </motion.div>
  );
}

function LoadingView({ address, phrase }: { address: string; phrase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="relative flex justify-center">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative w-16 h-16 rounded-full border-t-2 border-r-2 border-primary"
            style={{ rotate: 45 }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 w-16 h-16 rounded-full border-b-2 border-l-2 border-primary/40 text-primary flex items-center justify-center"
          >
            <Search className="w-6 h-6 animate-pulse" />
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-medium tracking-tight truncate max-w-sm mx-auto" title={address}>
            {address}
          </h2>
          <motion.p
            key={phrase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-primary/80 font-mono"
            data-testid="text-loading-phrase"
          >
            {phrase}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

function ErrorView({ error, onRetry, onReset }: { error: string; onRetry: () => void; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Analysis Failed</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={onReset} data-testid="button-error-reset">
            Start Over
          </Button>
          <Button onClick={onRetry} data-testid="button-error-retry">
            Try Again
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ResultsView({ data, onReset }: { data: ClimateRiskResult; onReset: () => void }) {
  const getRiskColor = (rating: string) => {
    switch (rating) {
      case "Minimal": return "var(--color-risk-minimal)";
      case "Low": return "var(--color-risk-low)";
      case "Moderate": return "var(--color-risk-moderate)";
      case "High": return "var(--color-risk-high)";
      case "Very High": return "var(--color-risk-very-high)";
      case "Extreme": return "var(--color-risk-extreme)";
      default: return "var(--color-muted)";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive text-destructive-foreground";
      case "Medium": return "bg-orange-500/20 text-orange-500 border border-orange-500/20";
      case "Low": return "bg-primary/20 text-primary border border-primary/20";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getFactorIcon = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes("flood")) return <Droplets className="w-4 h-4" />;
    if (l.includes("wildfire")) return <Flame className="w-4 h-4" />;
    if (l.includes("heat")) return <ThermometerSun className="w-4 h-4" />;
    if (l.includes("drought")) return <ThermometerSun className="w-4 h-4" />;
    if (l.includes("storm") || l.includes("wind")) return <Wind className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col"
    >
      {/* A. Property header bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="shrink-0 bg-secondary w-8 h-8 rounded-md flex items-center justify-center">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate text-foreground leading-none">
                {data.normalizedAddress}
              </h2>
              <p className="text-xs text-muted-foreground truncate mt-1 font-mono">
                {data.coordinates.lat.toFixed(5)}, {data.coordinates.lng.toFixed(5)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onReset} className="shrink-0" data-testid="button-analyze-another">
            <Search className="w-3.5 h-3.5 mr-2" />
            Analyze Another
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:py-10 space-y-10">
          
          {/* B. Overall ClimateIQ Score */}
          <section className="flex flex-col items-center text-center space-y-8 pb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                Overall Climate Risk
              </h3>
            </div>
            
            <div className="relative">
              <Gauge 
                value={data.overallScore} 
                max={100} 
                size={280} 
                strokeWidth={20}
              />
              <div 
                className="mt-6 inline-flex items-center px-4 py-1.5 rounded-full border font-bold text-lg tracking-wide uppercase"
                style={{ 
                  borderColor: getRiskColor(data.overallRating),
                  color: getRiskColor(data.overallRating),
                  backgroundColor: `color-mix(in srgb, ${getRiskColor(data.overallRating)} 10%, transparent)`
                }}
              >
                {data.overallRating}
              </div>
            </div>

            <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed" data-testid="text-summary">
              {data.summary}
            </p>
          </section>

          {/* C. Risk Factors */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 border-b pb-2">
              <CloudLightning className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-xl font-semibold tracking-tight">Risk Factors</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.factors.map((factor) => (
                <Card key={factor.id} className="bg-secondary/20 border-secondary hover:bg-secondary/30 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-background border text-foreground">
                          {getFactorIcon(factor.name)}
                        </div>
                        <h4 className="font-semibold">{factor.name}</h4>
                      </div>
                      <div 
                        className="text-xs font-bold px-2 py-0.5 rounded border"
                        style={{ 
                          borderColor: getRiskColor(factor.rating),
                          color: getRiskColor(factor.rating),
                          backgroundColor: `color-mix(in srgb, ${getRiskColor(factor.rating)} 10%, transparent)`
                        }}
                      >
                        {factor.rating}
                      </div>
                    </div>
                    
                    {/* Compact score bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-muted-foreground">
                        <span>Score: {factor.score}</span>
                        <span>100</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${factor.score}%`,
                            backgroundColor: getRiskColor(factor.rating)
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-snug">
                      {factor.description}
                    </p>
                    <p className="text-xs text-muted-foreground/50 font-mono pt-1">
                      Source: {factor.dataSource}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* D. Recommendations */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 border-b pb-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-xl font-semibold tracking-tight">Mitigation Actions</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {data.recommendations.map((rec) => (
                <div 
                  key={rec.id} 
                  className="group flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-xl border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="shrink-0 pt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right mt-2 sm:mt-0">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      {rec.estimatedCost}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
      
      {/* E. Footer */}
      <footer className="border-t border-border bg-card py-6 px-4 text-center mt-auto">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            Analysis powered by FEMA National Flood Hazard Layer, NOAA National Weather Service, US Drought Monitor. 
            Scores are estimates based on publicly available data and should not replace professional risk assessments.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
