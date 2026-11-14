import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate data types
    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res.status(400).json({
        message: "نوع اطلاعات ارسالی نامعتبر است.",
      });
    }

    // Validate required fields
    if (!fullName.trim() || !email.trim() || !password.trim() || !role.trim()) {
      return res.status(400).json({
        message: "تمام فیلدها الزامی هستند.",
      });
    }

    // Validate full name
    if (fullName.trim().length < 3 || fullName.trim().length > 100) {
      return res.status(400).json({
        message: "نام باید بین ۳ تا ۱۰۰ کاراکتر باشد.",
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        message: "فرمت ایمیل نامعتبر است.",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        message: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
      });
    }

    // Validate role
    if (!["artist", "producer"].includes(role)) {
      return res.status(400).json({
        message: "نقش کاربری نامعتبر است.",
      });
    }

    const result = await registerUser({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role: role as "artist" | "producer",
    });

    return res.status(201).json({
      message: "ثبت‌نام با موفقیت انجام شد.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور.";

    if (message === "این ایمیل قبلاً ثبت شده است.") {
      return res.status(409).json({ message });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      message: "خطای داخلی سرور.",
    });
  }
};


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate data types
    if (
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'نوع اطلاعات ارسالی نامعتبر است.',
      });
    }

    // Validate required fields
    if (!email.trim() || !password) {
      return res.status(400).json({
        message: 'ایمیل و رمز عبور الزامی هستند.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        message: 'فرمت ایمیل نامعتبر است.',
      });
    }

    // Login user
    const result = await loginUser(email.trim(), password);

    return res.status(200).json({
      message: 'ورود با موفقیت انجام شد.',
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          message: 'ایمیل یا رمز عبور اشتباه است.',
        });
      }

      if (error.message === 'ACCOUNT_SUSPENDED') {
        return res.status(403).json({
          message: 'حساب کاربری شما غیرفعال است.',
        });
      }
    }

    console.error('Login error:', error);

    return res.status(500).json({
      message: 'خطای داخلی سرور.',
    });
  }
};
