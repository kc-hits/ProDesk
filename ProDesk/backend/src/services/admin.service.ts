
import { pool } from "../config/database.js";

export const getAdminDashboard = async () => {
  const result = await pool.query(`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM users
      ) AS total_users,

      (
        SELECT COUNT(*)::int
        FROM users
        WHERE role = 'artist'
      ) AS total_artists,

      (
        SELECT COUNT(*)::int
        FROM users
        WHERE role = 'producer'
      ) AS total_producers,

      (
        SELECT COUNT(*)::int
        FROM beats
      ) AS total_beats,

      (
        SELECT COUNT(*)::int
        FROM beats
        WHERE status = 'published'
      ) AS published_beats,

      (
        SELECT COUNT(*)::int
        FROM orders
      ) AS total_orders,

      (
        SELECT COUNT(*)::int
        FROM payments
        WHERE status = 'successful'
      ) AS successful_payments,

      (
        SELECT COUNT(*)::int
        FROM custom_orders
      ) AS total_custom_orders
  `);

  return result.rows[0];
};

// Get all users
export const getAllUsers = async () => {
  const result = await pool.query(`
    SELECT
      id,
      full_name,
      email,
      role,
      status,
      created_at
    FROM users
    ORDER BY created_at DESC
  `);

  return result.rows;
};
// Update user status
export type UserStatus = "active" | "suspended";

export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
) => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        full_name,
        email,
        role,
        status,
        updated_at
    `,
    [status, userId],
  );

  return result.rows[0] ?? null;
};

export const getAllBeats = async () => {
  const result = await pool.query(`
    SELECT
      b.id,
      b.title,
      b.description,
      b.bpm,
      b.musical_key,
      b.cover_image_url,
      b.preview_audio_url,
      b.status,
      b.is_exclusively_sold,
      b.created_at,
      b.updated_at,

      g.name AS genre_name,
      sg.name AS subgenre_name,

      u.id AS producer_id,
      u.full_name AS producer_name,
      u.email AS producer_email

    FROM beats b

    INNER JOIN genres g
      ON g.id = b.genre_id

    LEFT JOIN subgenres sg
      ON sg.id = b.subgenre_id

    INNER JOIN users u
      ON u.id = b.producer_id

    ORDER BY b.created_at DESC
  `);

  return result.rows;
};