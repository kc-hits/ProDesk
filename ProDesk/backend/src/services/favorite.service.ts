
import { pool } from "../config/database.js";

// Get all favorites of a user
export const getUserFavorites = async (userId: string) => {
  const result = await pool.query(
    `
      SELECT
        f.id AS favorite_id,
        f.created_at AS favorited_at,
        b.id AS beat_id,
        b.title,
        b.description,
        b.bpm,
        b.musical_key,
        b.cover_image_url,
        b.preview_audio_url,
        b.producer_id,
        u.full_name AS producer_name
      FROM favorites f
      JOIN beats b ON b.id = f.beat_id
      JOIN users u ON u.id = b.producer_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `,
    [userId],
  );

  return result.rows;
};

// Add a beat to favorites
export const addFavorite = async (
  userId: string,
  beatId: string,
) => {
  const result = await pool.query(
    `
      INSERT INTO favorites (user_id, beat_id)
      SELECT $1, b.id
      FROM beats b
      WHERE b.id = $2
        AND b.status = 'published'
      ON CONFLICT (user_id, beat_id) DO NOTHING
      RETURNING *
    `,
    [userId, beatId],
  );

  return result.rows[0] ?? null;
};

// Remove a beat from favorites
export const removeFavorite = async (
  userId: string,
  beatId: string,
) => {
  const result = await pool.query(
    `
      DELETE FROM favorites
      WHERE user_id = $1
        AND beat_id = $2
      RETURNING *
    `,
    [userId, beatId],
  );

  return result.rows[0] ?? null;
};

// Check if a beat is in user's favorites
export const isFavorite = async (
  userId: string,
  beatId: string,
) => {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM favorites
        WHERE user_id = $1
          AND beat_id = $2
      ) AS is_favorite
    `,
    [userId, beatId],
  );

  return result.rows[0].is_favorite as boolean;
};
