import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/special-elite/400.css";
import "@fontsource/roboto-condensed/400.css";
import "@fontsource/roboto-condensed/600.css";
import "@fontsource/roboto-condensed/700.css";
import "./styles.css";
import { Soundboard } from "@/components/soundboard/Soundboard";
import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Soundboard />
    <Toaster />
  </StrictMode>,
);
