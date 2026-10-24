"use client";

import { useState } from "react";
import { ArticleCard } from "@/app/_ui/ArticleCard";
import { Chip } from "@/app/_ui/Chip";
import type { ArticleSummary } from "@/lib/blog/content";
import styles from "./blog.module.css";

// Filtro por categoría + cuadrícula. Con "Todas", el destacado (arriba) no se repite en la cuadrícula.
export function BlogGrid({ articles, categories, featuredSlug }: { articles: ArticleSummary[]; categories: string[]; featuredSlug?: string }) {
  const [filter, setFilter] = useState<string | null>(null);
  const list = filter ? articles.filter((a) => a.categoria === filter) : articles.filter((a) => a.slug !== featuredSlug);

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filtrar por categoría">
        <Chip pressed={filter === null} onClick={() => setFilter(null)}>
          Todas
        </Chip>
        {categories.map((c) => (
          <Chip key={c} pressed={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <p className="vv-sr-only" role="status" aria-live="polite">
        {filter ? `${list.length} en ${filter}` : ""}
      </p>
      {list.length > 0 ? (
        <ul className={styles.grid}>
          {list.map((a) => (
            <li key={a.slug}>
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Todavía no hay artículos en esta categoría.</p>
      )}
    </>
  );
}
