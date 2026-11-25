import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const STOP_WORDS = new Set([
  'in', 'on', 'at', 'for', 'with', 'and', 'or', 'the', 'a', 'an', 'of', 'to', 'near', 'from', 'by',
]);

export interface ParsedSearchIntent {
  cleanQuery: string;
  tokenGroups: string[][];
  inferredMaxPrice?: number;
  inferredMinPrice?: number;
}

/** Parses free-form query text into normalized tokens + optional budget intent (e.g. "under 20k"). */
export function parseSearchQuery(rawQuery?: string): ParsedSearchIntent {
  if (!rawQuery || !rawQuery.trim()) {
    return { cleanQuery: '', tokenGroups: [] };
  }

  let working = rawQuery.trim();
  let inferredMaxPrice: number | undefined;
  let inferredMinPrice: number | undefined;

  const parseAmount = (numStr: string, unit?: string): number => {
    const base = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(base)) return 0;
    const u = (unit || '').toLowerCase();
    if (u === 'k') return Math.round(base * 1000);
    if (u === 'l' || u === 'lac' || u === 'lakh' || u === 'lakhs') return Math.round(base * 100000);
    return Math.round(base);
  };

  // Detect "under/below/upto <amount>"
  const maxMatch = working.match(/\b(?:under|below|upto|less\s+than)\s+(?:rs\.?|₹)?\s*(\d+(?:[.,]\d+)?)\s*(k|l|lac|lakh|lakhs)?\b/i);
  if (maxMatch) {
    const val = parseAmount(maxMatch[1], maxMatch[2]);
    if (val > 0) inferredMaxPrice = val;
    working = working.replace(maxMatch[0], ' ');
  }

  // Detect "above/over <amount>"
  const minMatch = working.match(/\b(?:above|over|more\s+than)\s+(?:rs\.?|₹)?\s*(\d+(?:[.,]\d+)?)\s*(k|l|lac|lakh|lakhs)?\b/i);
  if (minMatch) {
    const val = parseAmount(minMatch[1], minMatch[2]);
    if (val > 0) inferredMinPrice = val;
    working = working.replace(minMatch[0], ' ');
  }

  const cleanQuery = working.replace(/\s+/g, ' ').trim();
  if (!cleanQuery) {
    return { cleanQuery: '', tokenGroups: [], inferredMaxPrice, inferredMinPrice };
  }

  const rawTokens = cleanQuery
    .split(/[\s,+/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t.toLowerCase()));

  const tokenGroups = rawTokens.map((token) => {
    const lower = token.toLowerCase();
    const variants = new Set<string>([token]);
    if (lower.length > 3 && lower.endsWith('s') && !lower.endsWith('ss')) {
      variants.add(token.slice(0, -1));
    } else if (lower.length > 2 && !lower.endsWith('s')) {
      variants.add(`${token}s`);
    }
    return Array.from(variants);
  });

  return { cleanQuery, tokenGroups, inferredMaxPrice, inferredMinPrice };
}

/** Builds a Prisma AND-of-ORs filter matching each token across title, description, category, location, attributes, and seller. */
export function buildTokenWhereConditions(tokenGroups: string[][]): Prisma.AdWhereInput[] {
  return tokenGroups.map((variants) => ({
    OR: variants.flatMap((term) => [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { category: { name: { contains: term, mode: 'insensitive' } } },
      { category: { slug: { contains: term, mode: 'insensitive' } } },
      { category: { parent: { name: { contains: term, mode: 'insensitive' } } } },
      { location: { name: { contains: term, mode: 'insensitive' } } },
      { location: { parent: { name: { contains: term, mode: 'insensitive' } } } },
      { attributeValues: { some: { value: { contains: term, mode: 'insensitive' } } } },
      { user: { profile: { name: { contains: term, mode: 'insensitive' } } } },
      { user: { profile: { businessName: { contains: term, mode: 'insensitive' } } } },
    ]),
  }));
}

/** Typo-tolerant PostgreSQL pg_trgm similarity lookup across active ads, attributes, categories, locations, and sellers. */
export async function findFuzzyAdIds(query: string, limit = 60): Promise<string[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const rows = await prisma.$queryRaw<Array<{ id: string; score: number }>>`
    SELECT DISTINCT ON (a.id) a.id,
      GREATEST(
        word_similarity(${clean}, a.title) * 5.0,
        similarity(${clean}, a.title) * 4.0,
        COALESCE((
          SELECT MAX(word_similarity(${clean}, aav.value) * 3.5)
          FROM ad_attribute_values aav
          WHERE aav.ad_id = a.id
        ), 0),
        COALESCE(word_similarity(${clean}, c.name) * 2.5, 0),
        COALESCE(word_similarity(${clean}, l.name) * 2.5, 0),
        COALESCE(word_similarity(${clean}, p.name) * 2.0, 0),
        COALESCE(word_similarity(${clean}, p.business_name) * 2.0, 0),
        word_similarity(${clean}, a.description) * 1.0
      ) AS score
    FROM ads a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN locations l ON l.id = a.location_id
    LEFT JOIN profiles p ON p.user_id = a.user_id
    WHERE a.status = 'ACTIVE'
      AND a.deleted_at IS NULL
      AND a.expires_at > NOW()
      AND (
        word_similarity(${clean}, a.title) > 0.28
        OR word_similarity(${clean}, a.description) > 0.25
        OR word_similarity(${clean}, c.name) > 0.35
        OR word_similarity(${clean}, l.name) > 0.35
        OR word_similarity(${clean}, p.name) > 0.35
        OR word_similarity(${clean}, p.business_name) > 0.35
        OR EXISTS (
          SELECT 1 FROM ad_attribute_values aav
          WHERE aav.ad_id = a.id AND word_similarity(${clean}, aav.value) > 0.32
        )
      )
    ORDER BY a.id, score DESC
  `;

  return rows
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit)
    .map((r) => r.id);
}

/** Computes a deterministic relevance score for in-memory ranking when sorting by relevance. */
export function sortAdsByRelevance<T extends {
  title?: string;
  description?: string | null;
  category?: { name?: string | null } | null;
  location?: { name?: string | null } | null;
  user?: { profile?: { name?: string | null; businessName?: string | null } | null } | null;
  attributeValues?: Array<{ value: string }>;
  viewCount?: number;
}>(ads: T[], cleanQuery: string, tokenGroups: string[][]): T[] {
  const fullLower = cleanQuery.toLowerCase();

  const scoreAd = (ad: T): number => {
    let score = 0;
    const title = (ad.title || '').toLowerCase();
    const desc = (ad.description || '').toLowerCase();
    const cat = (ad.category?.name || '').toLowerCase();
    const loc = (ad.location?.name || '').toLowerCase();
    const seller = `${ad.user?.profile?.name || ''} ${ad.user?.profile?.businessName || ''}`.toLowerCase();
    const attrs = (ad.attributeValues || []).map((a) => a.value.toLowerCase()).join(' ');

    if (fullLower && title.includes(fullLower)) score += 100;

    for (const variants of tokenGroups) {
      if (variants.some((v) => title.includes(v.toLowerCase()))) score += 25;
      if (variants.some((v) => attrs.includes(v.toLowerCase()))) score += 15;
      if (variants.some((v) => cat.includes(v.toLowerCase()))) score += 12;
      if (variants.some((v) => loc.includes(v.toLowerCase()))) score += 10;
      if (variants.some((v) => seller.includes(v.toLowerCase()))) score += 8;
      if (variants.some((v) => desc.includes(v.toLowerCase()))) score += 4;
    }

    return score;
  };

  return [...ads].sort((a, b) => {
    const diff = scoreAd(b) - scoreAd(a);
    if (diff !== 0) return diff;
    return (b.viewCount || 0) - (a.viewCount || 0);
  });
}
