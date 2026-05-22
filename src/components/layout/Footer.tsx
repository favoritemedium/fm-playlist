"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { isAllFilterValue, type PlaylistFilterValue } from "@/lib/constants";

interface FooterProps {
  trackCount: number;
  selectedMonth: PlaylistFilterValue;
  selectedYear: PlaylistFilterValue;
}

function formatPeriodLocalized(
  month: PlaylistFilterValue,
  year: PlaylistFilterValue,
  locale: string
): string | null {
  if (isAllFilterValue(month)) {
    return isAllFilterValue(year) ? null : year.toString();
  }

  if (isAllFilterValue(year)) {
    return new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2024, (month as number) - 1, 1)
    );
  }

  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year as number, (month as number) - 1, 1)
  );
}

export function Footer({ trackCount, selectedMonth, selectedYear }: FooterProps) {
  const t = useTranslations("playlist.footer");
  const locale = useLocale();
  const periodLabel = formatPeriodLocalized(selectedMonth, selectedYear, locale);

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-16 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        {trackCount} {t("track", { count: trackCount })}
        {periodLabel ? <> {t("inPeriod", { period: periodLabel })}</> : <> {t("total")}</>}
      </p>
    </motion.footer>
  );
}
