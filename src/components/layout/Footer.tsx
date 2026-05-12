"use client";

import { motion } from "motion/react";
import {
  formatPlaylistPeriod,
  type PlaylistFilterValue,
} from "@/lib/constants";

interface FooterProps {
  trackCount: number;
  selectedMonth: PlaylistFilterValue;
  selectedYear: PlaylistFilterValue;
}

export function Footer({ trackCount, selectedMonth, selectedYear }: FooterProps) {
  const periodLabel = formatPlaylistPeriod(selectedMonth, selectedYear);

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-16 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        {trackCount} {trackCount === 1 ? "track" : "tracks"}
        {periodLabel ? <> in {periodLabel}</> : " total"}
      </p>
    </motion.footer>
  );
}
