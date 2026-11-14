import { pool } from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

type UserRole = "artist" | "producer";

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export const registerUser = async (data: RegisterData) => {
  const email = data.email.trim().toLowerCase();

  // 1. Check JWT secret
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

  // 2. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 3. Start database transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 4. Check duplicate email
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      throw new Error("این ایمیل قبلاً ثبت شده است.");
    }

    // 5. Create user
    const result = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, status`,
      [data.fullName.trim(), email, passwordHash, data.role],
    );

    const user = result.rows[0];

    // 6. Create role-specific profile
    if (user.role === "artist") {
      await client.query(
        `INSERT INTO artist_profiles (user_id)
         VALUES ($1)`,
        [user.id],
      );
    } else if (user.role === "producer") {
      await client.query(
        `INSERT INTO producer_profiles (user_id)
         VALUES ($1)`,
        [user.id],
      );
    }

    // 7. Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      { expiresIn },
    );

    // 8. Commit transaction
    await client.query("COMMIT");

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


export const loginUser = async (email: string, password: string) => {
  // 1. Find user by email
  const result = await pool.query(
    `SELECT id, full_name, email, password_hash, role, status
     FROM users
     WHERE email = $1`,
    [email.trim().toLowerCase()],
  );

  if (result.rows.length === 0) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = result.rows[0];

  // 2. Check password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // 3. Check account status
  if (user.status !== "active") {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  // 4. Generate JWT
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    jwtSecret,
    { expiresIn },
  );

  // 5. Return user and token
  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};
