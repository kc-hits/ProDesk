import type { Request, Response } from "express";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { STORAGE_ROOT, resolveStoragePath } from "../config/storage.js";
import {
  createBeat,
  getBeatById,
  getBeatForUpdate,
  updateBeat,
  deleteBeat,
  restoreBeat,
  getMyBeats,
  publishBeat,
  unpublishBeat,
} from "../services/beat.service.js";
import { pool } from "../config/database.js";
const isUuid = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
};
const cleanupUploadedFiles = async (files: Express.Multer.File[]) => {
  await Promise.all(
    files.map(async (file) => {
      try {
        await unlink(file.path);
      } catch (error) {
        console.error("Failed to remove uploaded file:", error);
      }
    }),
  );
};

const getUploadedAudioFiles = (req: Request) => {
  const files = req.files as
    | {
        previewAudio?: Express.Multer.File[];
        originalAudio?: Express.Multer.File[];
      }
    | undefined;

  return {
    preview: files?.previewAudio?.[0],
    original: files?.originalAudio?.[0],
  };
};

const getStorageKey = (file: Express.Multer.File) =>
  path.relative(STORAGE_ROOT, file.path).replace(/\\/g, "/");
const isOptionalString = (value: unknown): boolean => {
  return value === undefined || value === null || typeof value === "string";
};

export const createBeatController = async (req: Request, res: Response) => {
  const uploadedFiles = getUploadedAudioFiles(req);
  const filesToCleanup = [uploadedFiles.preview, uploadedFiles.original].filter(
    (file): file is Express.Multer.File => Boolean(file),
  );

  try {
    const {
      title,
      description,
      genreId,
      subgenreId,
      bpm,
      musicalKey,
      coverImageUrl,
      moodIds,
      licenses,
    } = req.body;

    // Required audio files
    if (!uploadedFiles.preview || !uploadedFiles.original) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Preview and original audio files are required.",
      });
    }

    // Parse multipart fields
    const parsedBpm = Number(bpm);

    let parsedMoodIds: unknown;
    let parsedLicenses: unknown;

    try {
      parsedMoodIds =
        typeof moodIds === "string" ? JSON.parse(moodIds) : moodIds;

      parsedLicenses =
        typeof licenses === "string" ? JSON.parse(licenses) : licenses;
    } catch {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid moods or licenses format.",
      });
    }

    // Validate title
    if (
      typeof title !== "string" ||
      title.trim().length === 0 ||
      title.trim().length > 150
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Title must be between 1 and 150 characters.",
      });
    }

    if (!isUuid(genreId)) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "A valid genre ID is required.",
      });
    }

    if (
      subgenreId !== undefined &&
      subgenreId !== null &&
      subgenreId !== "" &&
      !isUuid(subgenreId)
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid subgenre ID.",
      });
    }

    if (!Number.isInteger(parsedBpm) || parsedBpm < 1 || parsedBpm > 32767) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "BPM must be an integer between 1 and 32767.",
      });
    }

    if (
      !isOptionalString(description) ||
      !isOptionalString(musicalKey) ||
      !isOptionalString(coverImageUrl)
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid optional text fields.",
      });
    }

    if (
      !Array.isArray(parsedMoodIds) ||
      !parsedMoodIds.every(isUuid) ||
      new Set(parsedMoodIds).size !== parsedMoodIds.length
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Mood IDs must be an array of unique valid UUIDs.",
      });
    }

    if (!Array.isArray(parsedLicenses) || parsedLicenses.length === 0) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "At least one license is required.",
      });
    }

    const licenseIds = new Set<string>();

    for (const license of parsedLicenses) {
      if (
        !license ||
        !isUuid(license.licenseId) ||
        licenseIds.has(license.licenseId) ||
        typeof license.price !== "number" ||
        !Number.isFinite(license.price) ||
        license.price <= 0 ||
        (license.usageLimit != null &&
          (!Number.isInteger(license.usageLimit) || license.usageLimit <= 0)) ||
        (license.distributionLimit != null &&
          (!Number.isInteger(license.distributionLimit) ||
            license.distributionLimit <= 0)) ||
        typeof license.allowsCommercialUse !== "boolean" ||
        typeof license.allowsContentId !== "boolean" ||
        typeof license.isExclusive !== "boolean"
      ) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "One or more license details are invalid.",
        });
      }

      licenseIds.add(license.licenseId);
    }

    const genreResult = await pool.query(
      "SELECT id FROM genres WHERE id = $1",
      [genreId],
    );

    if (genreResult.rows.length === 0) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Selected genre does not exist.",
      });
    }

    if (subgenreId) {
      const subgenreResult = await pool.query(
        `
          SELECT id
          FROM subgenres
          WHERE id = $1 AND genre_id = $2
        `,
        [subgenreId, genreId],
      );

      if (subgenreResult.rows.length === 0) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "Selected subgenre does not belong to this genre.",
        });
      }
    }

    if (parsedMoodIds.length > 0) {
      const moodsResult = await pool.query(
        "SELECT id FROM moods WHERE id = ANY($1::uuid[])",
        [parsedMoodIds],
      );

      if (moodsResult.rows.length !== parsedMoodIds.length) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "One or more selected moods do not exist.",
        });
      }
    }

    const licensesResult = await pool.query(
      "SELECT id FROM licenses WHERE id = ANY($1::uuid[])",
      [[...licenseIds]],
    );

    if (licensesResult.rows.length !== parsedLicenses.length) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "One or more selected licenses do not exist.",
      });
    }

    const auth = res.locals.auth;

    if (!auth || auth.role !== "producer") {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(403).json({
        message: "Only producers can create beats.",
      });
    }

    const previewAudioUrl = `/uploads/beats/previews/${uploadedFiles.preview.filename}`;
    const originalAudioStorageKey = getStorageKey(uploadedFiles.original);

    const beat = await createBeat({
      producerId: auth.userId,
      title: title.trim(),
      description,
      genreId,
      subgenreId: subgenreId || null,
      bpm: parsedBpm,
      musicalKey,
      coverImageUrl,
      previewAudioUrl,
      originalAudioStorageKey,
      moodIds: parsedMoodIds,
      licenses: parsedLicenses,
    });

    const { original_audio_storage_key, ...safeBeat } = beat;

    return res.status(201).json({
      message: "Beat created successfully.",
      beat: safeBeat,
    });
  } catch (error) {
    await cleanupUploadedFiles(filesToCleanup);

    console.error("Create beat error:", error);

    return res.status(500).json({
      message: "Failed to create beat.",
    });
  }
};

export const getBeatsController = async (req: Request, res: Response) => {
  try {
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
            ),
            '[]'::json
          ) AS licenses

        FROM beats b
        JOIN genres g ON g.id = b.genre_id
        LEFT JOIN subgenres s ON s.id = b.subgenre_id
        LEFT JOIN producer_profiles p ON p.user_id = b.producer_id
        JOIN users u ON u.id = b.producer_id

        WHERE b.status = 'published'

        ORDER BY b.created_at DESC
      `,
    );

    return res.status(200).json({
      message: "Beats retrieved successfully.",
      beats: result.rows,
    });
  } catch (error) {
    console.error("Get beats error:", error);

    return res.status(500).json({
      message: "Failed to retrieve beats.",
    });
  }
};

export const getBeatByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const beat = await getBeatById(id);

    if (!beat) {
      return res.status(404).json({
        message: "Beat not found.",
      });
    }

    return res.status(200).json({
      message: "Beat retrieved successfully.",
      beat,
    });
  } catch (error) {
    console.error("Get beat by ID error:", error);

    return res.status(500).json({
      message: "Failed to retrieve beat.",
    });
  }
};


export const updateBeatController = async (req: Request, res: Response) => {
  const uploadedFiles = getUploadedAudioFiles(req);

  const filesToCleanup = [uploadedFiles.preview, uploadedFiles.original].filter(
    (file): file is Express.Multer.File => Boolean(file),
  );

  let databaseUpdated = false;

  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const {
      title,
      description,
      genreId,
      subgenreId,
      bpm,
      musicalKey,
      coverImageUrl,
      moodIds,
      licenses,
    } = req.body;

    const parsedBpm = Number(bpm);

    let parsedMoodIds: unknown;
    let parsedLicenses: unknown;

    try {
      parsedMoodIds =
        typeof moodIds === "string" ? JSON.parse(moodIds) : moodIds;

      parsedLicenses =
        typeof licenses === "string" ? JSON.parse(licenses) : licenses;
    } catch {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid moods or licenses format.",
      });
    }

    if (
      typeof title !== "string" ||
      title.trim().length === 0 ||
      title.trim().length > 150 ||
      !isUuid(genreId) ||
      !Number.isInteger(parsedBpm) ||
      parsedBpm < 1 ||
      parsedBpm > 32767
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid beat information.",
      });
    }

    if (
      !isOptionalString(description) ||
      !isOptionalString(musicalKey) ||
      !isOptionalString(coverImageUrl) ||
      (subgenreId !== undefined &&
        subgenreId !== null &&
        subgenreId !== "" &&
        !isUuid(subgenreId))
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid optional beat information.",
      });
    }

    if (
      !Array.isArray(parsedMoodIds) ||
      !parsedMoodIds.every(isUuid) ||
      new Set(parsedMoodIds).size !== parsedMoodIds.length
    ) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Invalid mood IDs.",
      });
    }

    if (!Array.isArray(parsedLicenses) || parsedLicenses.length === 0) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "At least one license is required.",
      });
    }

    const licenseIds = new Set<string>();

    for (const license of parsedLicenses) {
      if (
        !license ||
        !isUuid(license.licenseId) ||
        licenseIds.has(license.licenseId) ||
        typeof license.price !== "number" ||
        !Number.isFinite(license.price) ||
        license.price <= 0 ||
        (license.usageLimit != null &&
          (!Number.isInteger(license.usageLimit) || license.usageLimit <= 0)) ||
        (license.distributionLimit != null &&
          (!Number.isInteger(license.distributionLimit) ||
            license.distributionLimit <= 0)) ||
        typeof license.allowsCommercialUse !== "boolean" ||
        typeof license.allowsContentId !== "boolean" ||
        typeof license.isExclusive !== "boolean"
      ) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "Invalid license information.",
        });
      }

      licenseIds.add(license.licenseId);
    }

    const genreResult = await pool.query(
      "SELECT id FROM genres WHERE id = $1",
      [genreId],
    );

    if (genreResult.rows.length === 0) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "Selected genre does not exist.",
      });
    }

    if (subgenreId) {
      const subgenreResult = await pool.query(
        `
          SELECT id
          FROM subgenres
          WHERE id = $1 AND genre_id = $2
        `,
        [subgenreId, genreId],
      );

      if (subgenreResult.rows.length === 0) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "Selected subgenre does not belong to this genre.",
        });
      }
    }

    if (parsedMoodIds.length > 0) {
      const moodsResult = await pool.query(
        "SELECT id FROM moods WHERE id = ANY($1::uuid[])",
        [parsedMoodIds],
      );

      if (moodsResult.rows.length !== parsedMoodIds.length) {
        await cleanupUploadedFiles(filesToCleanup);

        return res.status(400).json({
          message: "One or more selected moods do not exist.",
        });
      }
    }

    const licensesResult = await pool.query(
      "SELECT id FROM licenses WHERE id = ANY($1::uuid[])",
      [[...licenseIds]],
    );

    if (licensesResult.rows.length !== parsedLicenses.length) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(400).json({
        message: "One or more selected licenses do not exist.",
      });
    }

    const auth = res.locals.auth;

    if (!auth || auth.role !== "producer") {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(403).json({
        message: "Only producers can update beats.",
      });
    }

    const existingBeat = await getBeatForUpdate(id, auth.userId);

    if (!existingBeat || existingBeat.producer_id !== auth.userId) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(404).json({
        message: "Beat not found or you do not own this beat.",
      });
    }

    const previewAudioUrl = uploadedFiles.preview
      ? `/uploads/beats/previews/${uploadedFiles.preview.filename}`
      : existingBeat.preview_audio_url;

    const originalAudioStorageKey = uploadedFiles.original
      ? getStorageKey(uploadedFiles.original)
      : existingBeat.original_audio_storage_key;

    const oldPreviewAudioUrl = existingBeat.preview_audio_url;
    const oldOriginalAudioStorageKey =
      existingBeat.original_audio_storage_key;

    const beat = await updateBeat(id, auth.userId, {
      title: title.trim(),
      description,
      genreId,
      subgenreId: subgenreId || null,
      bpm: parsedBpm,
      musicalKey,
      coverImageUrl,
      previewAudioUrl,
      originalAudioStorageKey,
      moodIds: parsedMoodIds,
      licenses: parsedLicenses,
    });

    if (!beat) {
      await cleanupUploadedFiles(filesToCleanup);

      return res.status(404).json({
        message: "Beat not found or you do not own this beat.",
      });
    }

    databaseUpdated = true;

    // Delete old preview after successful replacement.
    const previewPrefix = "/uploads/beats/previews/";

    if (
      uploadedFiles.preview &&
      oldPreviewAudioUrl?.startsWith(previewPrefix) &&
      oldPreviewAudioUrl !== previewAudioUrl
    ) {
      const oldPreviewStorageKey = `beats/previews/${oldPreviewAudioUrl.slice(
        previewPrefix.length,
      )}`;

      try {
        await unlink(resolveStoragePath(oldPreviewStorageKey));
      } catch (error) {
        console.error("Failed to remove old preview:", error);
      }
    }

    // Delete old original only if the new original was actually saved.
    if (
      uploadedFiles.original &&
      oldOriginalAudioStorageKey &&
      oldOriginalAudioStorageKey !== originalAudioStorageKey &&
      beat.original_audio_storage_key === originalAudioStorageKey
    ) {
      try {
        await unlink(resolveStoragePath(oldOriginalAudioStorageKey));
      } catch (error) {
        console.error("Failed to remove old original:", error);
      }
    }

    // If previous purchases require keeping the old original,
    // remove the newly uploaded original instead.
    if (
      uploadedFiles.original &&
      beat.original_audio_storage_key !== originalAudioStorageKey
    ) {
      await cleanupUploadedFiles([uploadedFiles.original]);
    }

    const {
      original_audio_storage_key,
      ...safeBeat
    } = beat;

    return res.status(200).json({
      message: "Beat updated successfully.",
      beat: safeBeat,
    });
  } catch (error) {
    // Do not delete uploaded files if the database update succeeded.
    if (!databaseUpdated) {
      await cleanupUploadedFiles(filesToCleanup);
    }

    console.error("Update beat error:", error);

    return res.status(500).json({
      message: "Failed to update beat.",
    });
  }
};

export const deleteBeatController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const auth = res.locals.auth;

    if (!isUuid(id)) {
      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const deletedBeat = await deleteBeat(id, auth.userId);

    if (!deletedBeat) {
      return res.status(404).json({
        message: "Beat not found or you do not own this beat.",
      });
    }

    return res.status(200).json({
      message: "Beat removed successfully.",
      beat: deletedBeat,
    });
  } catch (error) {
    console.error("Delete beat error:", error);

    return res.status(500).json({
      message: "Failed to remove beat.",
    });
  }
};

export const restoreBeatController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const auth = res.locals.auth;

    if (!isUuid(id)) {
      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const restoredBeat = await restoreBeat(id, auth.userId);

    if (!restoredBeat) {
      return res.status(404).json({
        message: "Removed beat not found or you do not own this beat.",
      });
    }

    return res.status(200).json({
      message: "Beat restored successfully.",
      beat: restoredBeat,
    });
  } catch (error) {
    console.error("Restore beat error:", error);

    return res.status(500).json({
      message: "Failed to restore beat.",
    });
  }
};
export const getMyBeatsController = async (req: Request, res: Response) => {
  try {
    const auth = res.locals.auth;

    const beats = await getMyBeats(auth.userId);

    return res.status(200).json({
      message: "Your beats retrieved successfully.",
      beats,
    });
  } catch (error) {
    console.error("Get my beats error:", error);

    return res.status(500).json({
      message: "Failed to retrieve your beats.",
    });
  }
};
export const publishBeatController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const auth = res.locals.auth;

    if (!isUuid(id)) {
      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const result = await publishBeat(id, auth.userId);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: "Beat published successfully.",
      beat: result.beat,
    });
  } catch (error) {
    console.error("Publish beat error:", error);

    return res.status(500).json({
      message: "Failed to publish beat.",
    });
  }
};
export const unpublishBeatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const auth = res.locals.auth;

    if (!isUuid(id)) {
      return res.status(400).json({
        message: "Invalid beat ID.",
      });
    }

    const result = await unpublishBeat(id, auth.userId);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: "Beat unpublished successfully.",
      beat: result.beat,
    });
  } catch (error) {
    console.error("Unpublish beat error:", error);

    return res.status(500).json({
      message: "Failed to unpublish beat.",
    });
  }
};