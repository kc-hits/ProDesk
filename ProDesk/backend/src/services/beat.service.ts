
import { pool } from "../config/database.js";
import type { PoolClient } from "pg";
interface BeatLicenseData {
  licenseId: string;
  price: number;
  usageLimit?: number | null;
  distributionLimit?: number | null;
  allowsCommercialUse: boolean;
  allowsContentId: boolean;
  isExclusive: boolean;
}

interface CreateBeatData {
  producerId: string;
  title: string;
  description?: string;
  genreId: string;
  subgenreId?: string;
  bpm: number;
  musicalKey?: string;
  coverImageUrl?: string;
  previewAudioUrl: string;
  originalAudioStorageKey: string;
  moodIds: string[];
  licenses: BeatLicenseData[];
}

type UpdateBeatData = Omit<
  CreateBeatData,
  "producerId" | "previewAudioUrl" | "originalAudioStorageKey"
> & {
  previewAudioUrl?: string;
  originalAudioStorageKey?: string;
};

type SupportedLicense = {
  licenseId: string;
  name: string;
  isExclusive: boolean;
};

const normalizeLicenseName = (name: string) =>
  name.trim().toLowerCase();

/**
 * Validates license IDs and determines their actual type
 * using the licenses table.
 *
 * The isExclusive value received from the frontend is ignored.
 */
const resolveSupportedLicenses = async (
  client: PoolClient,
  licenses: BeatLicenseData[],
): Promise<SupportedLicense[]> => {
  if (!Array.isArray(licenses) || licenses.length === 0) {
    throw new Error("At least one license is required.");
  }

  const licenseIds = licenses.map((license) => license.licenseId);

  if (new Set(licenseIds).size !== licenseIds.length) {
    throw new Error("Duplicate licenses are not allowed.");
  }

  const result = await client.query(
    `
      SELECT id, name
      FROM licenses
      WHERE id = ANY($1::uuid[])
    `,
    [licenseIds],
  );

  if (result.rows.length !== licenses.length) {
    throw new Error("One or more selected licenses do not exist.");
  }

  const metadataMap = new Map<string, string>(
    result.rows.map((row: { id: string; name: string }) => [
      row.id,
      row.name,
    ]),
  );

  const usedTypes = new Set<string>();

  return licenses.map((license) => {
    const name = metadataMap.get(license.licenseId);

    if (!name) {
      throw new Error("Invalid license.");
    }

    const normalizedName = normalizeLicenseName(name);

    if (!["basic", "exclusive"].includes(normalizedName)) {
      throw new Error("Only Basic and Exclusive licenses are supported.");
    }

    if (usedTypes.has(normalizedName)) {
      throw new Error("Each license type can only be added once.");
    }

    usedTypes.add(normalizedName);

    if (
      typeof license.price !== "number" ||
      !Number.isFinite(license.price) ||
      license.price <= 0
    ) {
      throw new Error("Invalid license price.");
    }

    return {
      licenseId: license.licenseId,
      name,
      isExclusive: normalizedName === "exclusive",
    };
  });
};

// Create Beat
export const createBeat = async (data: CreateBeatData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validate licenses and determine their actual types.
    const supportedLicenses = await resolveSupportedLicenses(
      client,
      data.licenses,
    );

    const beatResult = await client.query(
      `
        INSERT INTO beats (
          producer_id,
          title,
          description,
          genre_id,
          subgenre_id,
          bpm,
          musical_key,
          cover_image_url,
          preview_audio_url,
          original_audio_storage_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        data.producerId,
        data.title,
        data.description ?? null,
        data.genreId,
        data.subgenreId ?? null,
        data.bpm,
        data.musicalKey ?? null,
        data.coverImageUrl ?? null,
        data.previewAudioUrl,
        data.originalAudioStorageKey,
      ],
    );

    const beat = beatResult.rows[0];

    // Add moods
    for (const moodId of data.moodIds) {
      await client.query(
        `
          INSERT INTO beat_moods (beat_id, mood_id)
          VALUES ($1, $2)
        `,
        [beat.id, moodId],
      );
    }

    // Add licenses
    for (let index = 0; index < data.licenses.length; index++) {
      const license = data.licenses[index];
      const metadata = supportedLicenses[index];

      await client.query(
        `
          INSERT INTO beat_licenses (
            beat_id,
            license_id,
            price,
            usage_limit,
            distribution_limit,
            allows_commercial_use,
            allows_content_id,
            is_exclusive
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          beat.id,
          license.licenseId,
          license.price,
          license.usageLimit ?? null,
          license.distributionLimit ?? null,
          license.allowsCommercialUse,
          license.allowsContentId,
          metadata.isExclusive,
        ],
      );
    }

    await client.query("COMMIT");

    return beat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get Published Beats
export const getPublishedBeats = async () => {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.title,
        b.description,
        b.bpm,
        b.musical_key,
        b.cover_image_url,
        b.preview_audio_url,
        b.created_at,

        (
          SELECT COUNT(*)::int
          FROM favorites f
          WHERE f.beat_id = b.id
        ) AS favorite_count,

        g.name AS genre_name,
        sg.name AS subgenre_name,

        COALESCE(
          NULLIF(pp.producer_name, ''),
          u.full_name
        ) AS producer_name,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', m.id,
                'name', m.name
              )
            )
            FROM beat_moods bm
            JOIN moods m ON m.id = bm.mood_id
            WHERE bm.beat_id = b.id
          ),
          '[]'::json
        ) AS moods,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', bl.id,
                'name', l.name,
                'price', bl.price,
                'usageLimit', bl.usage_limit,
                'distributionLimit', bl.distribution_limit,
                'allowsCommercialUse', bl.allows_commercial_use,
                'allowsContentId', bl.allows_content_id,
                'isExclusive', bl.is_exclusive
              )
            )
            FROM beat_licenses bl
            JOIN licenses l ON l.id = bl.license_id
            WHERE bl.beat_id = b.id
              AND bl.is_available = TRUE
              AND LOWER(TRIM(l.name)) IN ('basic', 'exclusive')
          ),
          '[]'::json
        ) AS licenses

      FROM beats b

      JOIN genres g ON g.id = b.genre_id
      LEFT JOIN subgenres sg ON sg.id = b.subgenre_id
      LEFT JOIN producer_profiles pp ON pp.user_id = b.producer_id
      JOIN users u ON u.id = b.producer_id

      WHERE b.status = 'published'
        AND u.status = 'active'
        AND EXISTS (
          SELECT 1
          FROM beat_licenses bl
          JOIN licenses l ON l.id = bl.license_id
          WHERE bl.beat_id = b.id
            AND bl.is_available = TRUE
            AND LOWER(TRIM(l.name)) IN ('basic', 'exclusive')
        )

      ORDER BY b.created_at DESC
    `,
  );

  return result.rows;
};

// Get Published Beat By ID
export const getBeatById = async (beatId: string) => {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.producer_id,
        b.title,
        b.description,
        b.genre_id,
        g.name AS genre_name,
        b.subgenre_id,
        s.name AS subgenre_name,
        b.bpm,
        b.musical_key,
        b.cover_image_url,
        b.preview_audio_url,
        b.status,
        b.created_at,

        (
          SELECT COUNT(*)::int
          FROM favorites f
          WHERE f.beat_id = b.id
        ) AS favorite_count,

        COALESCE(
          NULLIF(p.producer_name, ''),
          u.full_name
        ) AS producer_name,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', m.id,
                'name', m.name
              )
            )
            FROM beat_moods bm
            JOIN moods m ON m.id = bm.mood_id
            WHERE bm.beat_id = b.id
          ),
          '[]'::json
        ) AS moods,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', bl.id,
                'license_id', l.id,
                'license_name', l.name,
                'price', bl.price,
                'usage_limit', bl.usage_limit,
                'distribution_limit', bl.distribution_limit,
                'allows_commercial_use', bl.allows_commercial_use,
                'allows_content_id', bl.allows_content_id,
                'is_exclusive', bl.is_exclusive
              )
            )
            FROM beat_licenses bl
            JOIN licenses l ON l.id = bl.license_id
            WHERE bl.beat_id = b.id
              AND bl.is_available = TRUE
              AND LOWER(TRIM(l.name)) IN ('basic', 'exclusive')
          ),
          '[]'::json
        ) AS licenses

      FROM beats b

      JOIN genres g ON g.id = b.genre_id
      LEFT JOIN subgenres s ON s.id = b.subgenre_id
      LEFT JOIN producer_profiles p ON p.user_id = b.producer_id
      JOIN users u ON u.id = b.producer_id

      WHERE b.id = $1
        AND b.status = 'published'
        AND u.status = 'active'
        AND EXISTS (
          SELECT 1
          FROM beat_licenses bl
          JOIN licenses l ON l.id = bl.license_id
          WHERE bl.beat_id = b.id
            AND bl.is_available = TRUE
            AND LOWER(TRIM(l.name)) IN ('basic', 'exclusive')
        )

      LIMIT 1
    `,
    [beatId],
  );

  return result.rows[0] ?? null;
};

// Update Beat
export const updateBeat = async (
  beatId: string,
  producerId: string,
  data: UpdateBeatData,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check ownership and lock beat.
    const ownershipResult = await client.query(
      `
        SELECT id
        FROM beats
        WHERE id = $1
          AND producer_id = $2
          AND status != 'removed'
          AND is_exclusively_sold = FALSE
        FOR UPDATE
      `,
      [beatId, producerId],
    );

    if (ownershipResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // 2. Validate submitted licenses using database metadata.
    const supportedLicenses = await resolveSupportedLicenses(
      client,
      data.licenses,
    );

    // 3. Update beat information.
    const beatResult = await client.query(
      `
        UPDATE beats
        SET
          title = $1,
          description = $2,
          genre_id = $3,
          subgenre_id = $4,
          bpm = $5,
          musical_key = $6,
          cover_image_url = $7,
          preview_audio_url = COALESCE($8, preview_audio_url),

          original_audio_storage_key = CASE
            WHEN EXISTS (
              SELECT 1
              FROM order_items oi
              WHERE oi.beat_id = beats.id
            )
            THEN original_audio_storage_key
            ELSE COALESCE($9, original_audio_storage_key)
          END,

          updated_at = NOW()

        WHERE id = $10
          AND producer_id = $11

        RETURNING *
      `,
      [
        data.title,
        data.description ?? null,
        data.genreId,
        data.subgenreId ?? null,
        data.bpm,
        data.musicalKey ?? null,
        data.coverImageUrl ?? null,
        data.previewAudioUrl ?? null,
        data.originalAudioStorageKey ?? null,
        beatId,
        producerId,
      ],
    );

    const beat = beatResult.rows[0];

    // 4. Replace moods.
    await client.query(
      "DELETE FROM beat_moods WHERE beat_id = $1",
      [beatId],
    );

    for (const moodId of data.moodIds) {
      await client.query(
        `
          INSERT INTO beat_moods (beat_id, mood_id)
          VALUES ($1, $2)
        `,
        [beatId, moodId],
      );
    }

    // 5. Get existing licenses and purchase history.
    const existingLicensesResult = await client.query(
      `
        SELECT
          bl.id,
          bl.license_id,
          bl.is_available,
          l.name AS license_name,

          EXISTS (
            SELECT 1
            FROM order_items oi
            WHERE oi.beat_license_id = bl.id
          ) AS has_purchases

        FROM beat_licenses bl
        JOIN licenses l ON l.id = bl.license_id

        WHERE bl.beat_id = $1
        FOR UPDATE OF bl
      `,
      [beatId],
    );

    const existingLicenses = existingLicensesResult.rows;

    // 6. Update existing licenses.
    for (const existingLicense of existingLicenses) {
      const licenseName = normalizeLicenseName(
        existingLicense.license_name,
      );

      const isBasic = licenseName === "basic";
      const isExclusive = licenseName === "exclusive";

      const updatedLicense = data.licenses.find(
        (license) => license.licenseId === existingLicense.license_id,
      );

      const hasPurchases = existingLicense.has_purchases;

      // Old unsupported licenses must not remain available.
      if (!isBasic && !isExclusive) {
        await client.query(
          `
            UPDATE beat_licenses
            SET
              is_available = FALSE,
              updated_at = NOW()
            WHERE id = $1
          `,
          [existingLicense.id],
        );

        continue;
      }

      // Keep the actual license type consistent with database metadata.
      if (hasPurchases) {
        // Basic remains available after purchase.
        // Exclusive becomes unavailable after purchase.
        await client.query(
          `
            UPDATE beat_licenses
            SET
              is_exclusive = $1,
              is_available = $2,
              updated_at = NOW()
            WHERE id = $3
          `,
          [
            isExclusive,
            isBasic ? true : false,
            existingLicense.id,
          ],
        );

        // Purchased license terms are preserved.
        continue;
      }

      if (updatedLicense) {
        // Update a license that has never been purchased.
        await client.query(
          `
            UPDATE beat_licenses
            SET
              price = $1,
              usage_limit = $2,
              distribution_limit = $3,
              allows_commercial_use = $4,
              allows_content_id = $5,
              is_exclusive = $6,
              is_available = TRUE,
              updated_at = NOW()
            WHERE id = $7
          `,
          [
            updatedLicense.price,
            updatedLicense.usageLimit ?? null,
            updatedLicense.distributionLimit ?? null,
            updatedLicense.allowsCommercialUse,
            updatedLicense.allowsContentId,
            isExclusive,
            existingLicense.id,
          ],
        );
      } else {
        // The producer removed this license from the edit form.
        await client.query(
          `
            UPDATE beat_licenses
            SET
              is_available = FALSE,
              updated_at = NOW()
            WHERE id = $1
          `,
          [existingLicense.id],
        );
      }
    }

    // 7. Add new licenses.
    for (let index = 0; index < data.licenses.length; index++) {
      const license = data.licenses[index];
      const metadata = supportedLicenses[index];

      const alreadyExists = existingLicenses.some(
        (existingLicense) =>
          existingLicense.license_id === license.licenseId,
      );

      if (!alreadyExists) {
        await client.query(
          `
            INSERT INTO beat_licenses (
              beat_id,
              license_id,
              price,
              usage_limit,
              distribution_limit,
              allows_commercial_use,
              allows_content_id,
              is_exclusive,
              is_available
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
          `,
          [
            beatId,
            license.licenseId,
            license.price,
            license.usageLimit ?? null,
            license.distributionLimit ?? null,
            license.allowsCommercialUse,
            license.allowsContentId,
            metadata.isExclusive,
          ],
        );
      }
    }

    await client.query("COMMIT");

    return beat;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteBeat = async (
  beatId: string,
  producerId: string,
) => {
  const result = await pool.query(
    `
      UPDATE beats
      SET
        status = 'removed',
        updated_at = NOW()
      WHERE id = $1
        AND producer_id = $2
        AND status != 'removed'
      RETURNING id, title, status
    `,
    [beatId, producerId],
  );

  return result.rows[0] ?? null;
};

export const restoreBeat = async (
  beatId: string,
  producerId: string,
) => {
  const result = await pool.query(
    `
      UPDATE beats
      SET
        status = 'published',
        updated_at = NOW()
      WHERE id = $1
        AND producer_id = $2
        AND status = 'removed'
      RETURNING id, title, status
    `,
    [beatId, producerId],
  );

  return result.rows[0] ?? null;
};

export const publishBeat = async (
  beatId: string,
  producerId: string,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const beatResult = await client.query(
      `
        SELECT
          id,
          title,
          preview_audio_url,
          original_audio_storage_key
        FROM beats
        WHERE id = $1
          AND producer_id = $2
          AND status = 'draft'
        FOR UPDATE
      `,
      [beatId, producerId],
    );

    if (beatResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Draft beat not found or you do not own this beat.",
      };
    }

    const beat = beatResult.rows[0];

    if (
      !beat.title ||
      !beat.preview_audio_url ||
      !beat.original_audio_storage_key
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Beat information is incomplete.",
      };
    }

    const licenseResult = await client.query(
      `
        SELECT bl.id
        FROM beat_licenses bl
        JOIN licenses l ON l.id = bl.license_id
        WHERE bl.beat_id = $1
          AND bl.is_available = TRUE
          AND LOWER(TRIM(l.name)) IN ('basic', 'exclusive')
        LIMIT 1
      `,
      [beatId],
    );

    if (licenseResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "At least one available Basic or Exclusive license is required.",
      };
    }

    const publishedResult = await client.query(
      `
        UPDATE beats
        SET
          status = 'published',
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, status
      `,
      [beatId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      beat: publishedResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getMyBeats = async (producerId: string) => {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.title,
        b.description,
        b.bpm,
        b.musical_key,
        b.cover_image_url,
        b.preview_audio_url,
        b.status,
        b.created_at,
        b.updated_at,

        g.name AS genre_name,
        sg.name AS subgenre_name,

        COALESCE(
          NULLIF(pp.producer_name, ''),
          u.full_name
        ) AS producer_name,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', m.id,
                'name', m.name
              )
            )
            FROM beat_moods bm
            JOIN moods m ON m.id = bm.mood_id
            WHERE bm.beat_id = b.id
          ),
          '[]'::json
        ) AS moods,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', bl.id,
                'license_id', bl.license_id,
                'name', l.name,
                'price', bl.price,
                'usage_limit', bl.usage_limit,
                'distribution_limit', bl.distribution_limit,
                'allows_commercial_use', bl.allows_commercial_use,
                'allows_content_id', bl.allows_content_id,
                'is_exclusive', bl.is_exclusive,
                'is_available', bl.is_available
              )
            )
            FROM beat_licenses bl
            JOIN licenses l ON l.id = bl.license_id
            WHERE bl.beat_id = b.id
          ),
          '[]'::json
        ) AS licenses

      FROM beats b
      JOIN genres g ON g.id = b.genre_id
      LEFT JOIN subgenres sg ON sg.id = b.subgenre_id
      JOIN users u ON u.id = b.producer_id
      LEFT JOIN producer_profiles pp ON pp.user_id = u.id

      WHERE b.producer_id = $1

      ORDER BY b.created_at DESC
    `,
    [producerId],
  );

  return result.rows;
};

export const getBeatForUpdate = async (
  beatId: string,
  producerId: string,
) => {
  const result = await pool.query(
    `
      SELECT
        id,
        producer_id,
        preview_audio_url,
        original_audio_storage_key
      FROM beats
      WHERE id = $1
        AND producer_id = $2
      LIMIT 1
    `,
    [beatId, producerId],
  );

  return result.rows[0] ?? null;
};

export const unpublishBeat = async (
  beatId: string,
  producerId: string,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const beatResult = await client.query(
      `
        SELECT id, title, status
        FROM beats
        WHERE id = $1
          AND producer_id = $2
          AND status = 'published'
        FOR UPDATE
      `,
      [beatId, producerId],
    );

    if (beatResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Published beat not found or you cannot unpublish this beat.",
      };
    }

    const result = await client.query(
      `
        UPDATE beats
        SET
          status = 'draft',
          updated_at = NOW()
        WHERE id = $1
          AND producer_id = $2
        RETURNING id, title, status
      `,
      [beatId, producerId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      beat: result.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
