"use client";

import { ReactNode, useEffect, useState } from "react";
import "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // During SSR and initial client hydration, render children in default fallback.
    if (!isMounted) {
        return <>{children}</>;
    }

    return <>{children}</>;
}
