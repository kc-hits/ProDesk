
import { pool } from "../config/database.js";

export const getFeaturedProducers = async () => {
  const result = await pool.query(
    `
      SELECT
        pp.user_id AS id,
        COALESCE(
          NULLIF(pp.producer_name, ''),
          u.full_name
        ) AS name,
        pp.avatar_url,
        pp.bio,
        COUNT(DISTINCT b.id)::int AS published_beats,
        COALESCE(
          ARRAY_AGG(DISTINCT g.name)
            FILTER (WHERE g.name IS NOT NULL),
          ARRAY[]::text[]
        ) AS genres

      FROM producer_profiles pp

      INNER JOIN users u
        ON u.id = pp.user_id

      INNER JOIN beats b
        ON b.producer_id = pp.user_id
        AND b.status = 'published'

      LEFT JOIN genres g
        ON g.id = b.genre_id

      WHERE u.status = 'active'

      GROUP BY
        pp.user_id,
        pp.producer_name,
        u.full_name,
        pp.avatar_url,
        pp.bio

      ORDER BY published_beats DESC

      LIMIT 3
    `
  );

  return result.rows;
};
