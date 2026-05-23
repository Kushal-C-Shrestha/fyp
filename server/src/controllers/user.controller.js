import * as userService from "../services/user.service.js";
import pool from "../config/db.js";
import fs from "fs";
import path from "path";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const resolveUrl = (filePath, req) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${getBaseUrl(req)}${normalized}`;
};

const deleteFile = async (filePath) => {
  if (!filePath) return;
  let cleanPath = filePath;
  if (/^https?:\/\//i.test(cleanPath)) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
    } catch {
      return;
    }
  }
  cleanPath = cleanPath.replace(/^\/+/, "");
  if (!cleanPath.startsWith("uploads/")) return;

  const absPath = path.resolve(process.cwd(), cleanPath);
  try {
    if (fs.existsSync(absPath)) {
      await fs.promises.unlink(absPath);
    }
  } catch (err) {
    console.error(`Failed to delete file on disk: ${absPath}`, err);
  }
};

export const getMeSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await userService.getUserSettings(userId);
    if (settings?.account?.profile_picture) {
      settings.account.profile_picture = resolveUrl(settings.account.profile_picture, req);
    }
    res.json({ settings });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch settings." });
  }
};

export const updateMeSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await userService.updateUserSettings(userId, req.body);
    if (result?.settings?.account?.profile_picture) {
      result.settings.account.profile_picture = resolveUrl(result.settings.account.profile_picture, req);
    }
    if (result?.user?.profile_picture) {
      result.user.profile_picture = resolveUrl(result.user.profile_picture, req);
    }
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to update settings." });
  }
};

export const uploadUserProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { rows } = await pool.query("SELECT profile_picture FROM users WHERE id = $1 LIMIT 1", [userId]);
    const oldPic = rows[0]?.profile_picture;

    const relativePath = `uploads/avatars/${req.file.filename}`;

    await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2", [relativePath, userId]);

    if (oldPic) {
      await deleteFile(oldPic);
    }

    const resolvedUrl = resolveUrl(relativePath, req);
    res.json({
      success: true,
      message: "Profile picture uploaded successfully.",
      profile_picture: resolvedUrl,
    });
  } catch (error) {
    console.error("Error in uploadUserProfilePicture:", error);
    res.status(500).json({ message: error.message || "Failed to upload profile picture." });
  }
};

export const deleteUserProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query("SELECT profile_picture FROM users WHERE id = $1 LIMIT 1", [userId]);
    const oldPic = rows[0]?.profile_picture;

    if (!oldPic) {
      return res.json({ success: true, message: "No profile picture to remove." });
    }

    await pool.query("UPDATE users SET profile_picture = NULL WHERE id = $1", [userId]);

    await deleteFile(oldPic);

    res.json({
      success: true,
      message: "Profile picture removed successfully.",
    });
  } catch (error) {
    console.error("Error in deleteUserProfilePicture:", error);
    res.status(500).json({ message: error.message || "Failed to remove profile picture." });
  }
};
