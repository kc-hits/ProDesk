
import { pool } from "../config/database.js";

export const getArtistDashboard = async (artistId: string) => {
  const result = await pool.query(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM orders
          WHERE artist_id = $1
            AND status = 'completed'
        ) AS purchases_count,

        0::int AS favorites_count,

        (
          SELECT COUNT(*)::int
          FROM reviews
          WHERE artist_id = $1
        ) AS reviews_count,

        (
          SELECT COUNT(*)::int
          FROM custom_orders
          WHERE artist_id = $1
        ) AS custom_orders_count
    `,
    [artistId],
  );

  return result.rows[0];
};
