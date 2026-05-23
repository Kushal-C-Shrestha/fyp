import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sanitizeHtml from "sanitize-html";
import pool from "../config/db.js";
import {
  ADMIN_ROLES,
  normalizeRole,
  isAdminRole,
  clamp,
  titleCase,
  slugify,
  coerceBoolean,
  parseJsonObject,
  parseJsonArray,
} from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

const BLOG_STATUS = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const EDITOR_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "pre",
  "code",
];

const sanitizeBlogMarkup = (value) =>
  sanitizeHtml(String(value || ""), {
    allowedTags: EDITOR_ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          src: attribs.src,
          alt: attribs.alt || "Blog image",
        },
      }),
    },
  }).trim();

const extractPlainText = (html) =>
  sanitizeHtml(String(html || ""), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();



const normalizeTagsInput = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input !== "string") return [];

  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split(",");
    }
  }

  return trimmed.split(",");
};

const normalizeTags = (input) => {
  const seen = new Set();
  return normalizeTagsInput(input)
    .map((item) => {
      const raw = typeof item === "string" ? item : item?.name || item?.label || "";
      const name = raw.replace(/\s+/g, " ").trim();
      const slug = slugify(name);
      if (!name || !slug || seen.has(slug)) return null;
      seen.add(slug);
      return { name: name.slice(0, 40), slug };
    })
    .filter(Boolean)
    .slice(0, 8);
};



const computeReadTimeMinutes = (plainText) => {
  const wordCount = String(plainText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const buildRelativeUploadPath = (filePath = "") => {
  const relative = path.relative(uploadsRoot, filePath);
  if (!relative || relative.startsWith("..")) return null;
  return `/uploads/${relative.split(path.sep).join("/")}`;
};

const buildAssetUrl = (baseUrl, assetPath) => {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return baseUrl ? `${baseUrl}${normalized}` : normalized;
};

const deleteRelativeUpload = async (relativePath) => {
  const normalized = String(relativePath || "").trim();
  if (!normalized) return;

  const withoutLeadingSlash = normalized.replace(/^\/+/, "");
  if (!withoutLeadingSlash.startsWith("uploads/")) return;

  const absolutePath = path.resolve(__dirname, "../../", withoutLeadingSlash);
  if (!absolutePath.startsWith(uploadsRoot)) return;

  await fs.promises.unlink(absolutePath).catch(() => null);
};



const getBlogMeta = (contentJson) => parseJsonObject(parseJsonObject(contentJson).meta, {});

const getBlogWorkflowStatus = (row = {}) => {
  const meta = getBlogMeta(row.content_json);
  const metaStatus = String(meta.status || "").trim();
  if (metaStatus) return titleCase(metaStatus);

  const approvalStatus = String(row.approval_status || "").trim().toLowerCase();
  if (approvalStatus === "approved") return BLOG_STATUS.APPROVED;
  if (approvalStatus === "rejected") return BLOG_STATUS.REJECTED;
  return BLOG_STATUS.PENDING;
};

const buildBlogContentJson = ({
  plainText = "",
  slug = "",
  excerpt = "",
  readTimeMinutes = 1,
  status = BLOG_STATUS.DRAFT,
  reviewNotes = "",
  reviewedBy = null,
  reviewedAt = null,
  featured = false,
} = {}) => ({
  plainText,
  meta: {
    slug,
    excerpt,
    readTimeMinutes,
    status,
    reviewNotes,
    reviewedBy,
    reviewedAt,
    featured: Boolean(featured),
  },
});

const getUserSummary = async (client, userId) => {
  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId)) return null;

  const { rows } = await client.query(
    `
      SELECT id, full_name, email
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [normalizedUserId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.full_name || "User",
  };
};

const mapTag = (tag = {}) => {
  const name = String(tag?.name || "").trim();
  return {
    id: tag?.id ?? null,
    name,
    slug: slugify(name),
  };
};

const mapBlogRow = (row, { baseUrl = "", includeContent = false, includeReview = false } = {}) => {
  const contentJson = parseJsonObject(row?.content_json, {});
  const meta = getBlogMeta(contentJson);
  const tags = parseJsonArray(row?.tags)
    .map(mapTag)
    .filter((tag) => tag.slug && tag.name)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));

  const plainText = String(contentJson?.plainText || extractPlainText(row?.content_html || "")).trim();
  const slug = String(meta.slug || "").trim() || slugify(row?.blog_title) || String(row?.blog_id || "");
  const excerpt = String(meta.excerpt || "").trim() || plainText.slice(0, 220);
  const status = getBlogWorkflowStatus(row);
  const reviewNotes = String(meta.reviewNotes || "").trim();
  const reviewerName = String(meta.reviewedBy?.name || meta.reviewerName || "").trim();
  const coverImage = buildAssetUrl(baseUrl, row?.cover_image_url);
  const authorAvatar = buildAssetUrl(baseUrl, row?.author_profile_picture);
  const publishedDate = row?.published_at || row?.created_at;

  return {
    id: row?.blog_id,
    slug,
    title: row?.blog_title || "",
    excerpt,
    coverImage,
    readTimeMinutes: Number(meta.readTimeMinutes) || computeReadTimeMinutes(plainText),
    status,
    featured: Boolean(meta.featured),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
    publishedAt: row?.published_at,
    reviewedAt: meta.reviewedAt || null,
    author: {
      id: row?.author_user_id,
      name: row?.author_name || "Unknown author",
      avatar: authorAvatar,
    },
    tags,
    category: tags[0]?.name || "Health",
    image: coverImage,
    authorName: row?.author_name || "Unknown author",
    authorAvatar,
    date: publishedDate
      ? new Date(publishedDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "",
    desc: excerpt,
    ...(includeContent ? { contentHtml: row?.content_html || "" } : {}),
    ...(includeReview ? { reviewNotes, reviewerName } : {}),
  };
};

const buildBlogListQuery = ({
  whereClause = "1=1",
  orderClause = "COALESCE(b.published_at, b.created_at) DESC",
  limitParam = "$1",
  offsetParam = "$2",
}) => `
  SELECT
    b.id AS blog_id,
    b.author_id AS author_user_id,
    b.title AS blog_title,
    b.content_html,
    b.content_json,
    b.cover_image_url,
    b.approval_status::text AS approval_status,
    b.created_at,
    b.updated_at,
    b.published_at,
    author.full_name AS author_name,
    author.profile_picture AS author_profile_picture,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', t.id,
          'name', t.name
        )
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS tags
  FROM blogs b
  JOIN users author ON author.id = b.author_id
  LEFT JOIN blog_tag_mappings btm ON btm.blog_id = b.id
  LEFT JOIN blog_tags t ON t.id = btm.tag_id
  WHERE ${whereClause}
  GROUP BY b.id, author.id
  ORDER BY ${orderClause}
  LIMIT ${limitParam}
  OFFSET ${offsetParam}
`;

const fetchBlogById = async ({
  client = pool,
  blogId,
  baseUrl = "",
  includeContent = true,
  includeReview = true,
}) => {
  const { rows } = await client.query(
    buildBlogListQuery({
      whereClause: "b.id = $1 AND b.deleted_at IS NULL",
      limitParam: "$2",
      offsetParam: "$3",
    }),
    [blogId, 1, 0]
  );

  if (!rows.length) return null;
  return mapBlogRow(rows[0], { baseUrl, includeContent, includeReview });
};

const getBlogAccessRecord = async (client, blogId) => {
  const { rows } = await client.query(
    `
      SELECT id, author_id, cover_image_url, approval_status::text AS approval_status, content_json
      FROM blogs
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [blogId]
  );

  return rows[0] || null;
};

const ensureUniqueSlug = async (client, title, currentBlogId = null) => {
  const baseSlug = slugify(title) || `blog-${Date.now()}`;
  let slugCandidate = baseSlug;
  let suffix = 2;

  while (true) {
    const values = [slugCandidate];
    let query = `
      SELECT id
      FROM blogs
      WHERE deleted_at IS NULL
        AND COALESCE(content_json->'meta'->>'slug', '') = $1
    `;

    if (currentBlogId) {
      query += ` AND id <> $2`;
      values.push(currentBlogId);
    }

    const { rows } = await client.query(query, values);
    if (!rows.length) return slugCandidate;

    slugCandidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const syncBlogTags = async (client, blogId, tags) => {
  await client.query(`DELETE FROM blog_tag_mappings WHERE blog_id = $1`, [blogId]);

  for (const tag of tags) {
    const { rows } = await client.query(
      `
        INSERT INTO blog_tags (name, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (name)
        DO UPDATE SET updated_at = NOW()
        RETURNING id
      `,
      [tag.name]
    );

    await client.query(
      `
        INSERT INTO blog_tag_mappings (blog_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (blog_id, tag_id) DO NOTHING
      `,
      [blogId, rows[0].id]
    );
  }
};

const resolveRequestedStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "submit", "pending_approval"].includes(normalized)) return BLOG_STATUS.PENDING;
  return BLOG_STATUS.DRAFT;
};

const buildBlogPayload = ({ payload = {}, coverImagePath = null, existingBlog = null }) => {
  const title = clamp(payload.title, 220);
  if (title.length < 8) {
    throw { status: 400, message: "Blog title must be at least 8 characters long." };
  }

  const sanitizedContent = sanitizeBlogMarkup(payload.contentHtml || payload.content || payload.body || "");
  const plainText = extractPlainText(sanitizedContent);
  const containsImage = /<img\b/i.test(sanitizedContent);
  if (plainText.length < 40 && !containsImage) {
    throw { status: 400, message: "Blog content should include at least a short readable article." };
  }

  const excerptSource = clamp(payload.excerpt, 220);
  const excerpt = excerptSource || plainText.slice(0, 220);
  if (!excerpt) {
    throw { status: 400, message: "Blog excerpt could not be generated from the content." };
  }

  const removeCoverImage = coerceBoolean(payload.removeCoverImage);
  const finalCoverImagePath =
    coverImagePath !== null
      ? coverImagePath
      : removeCoverImage
        ? null
        : existingBlog?.cover_image_url ?? null;

  return {
    title,
    excerpt,
    contentHtml: sanitizedContent,
    plainText,
    readTimeMinutes: computeReadTimeMinutes(plainText),
    tags: normalizeTags(payload.tags),
    status: resolveRequestedStatus(payload.status || payload.statusAction),
    removeCoverImage,
    coverImagePath: finalCoverImagePath,
  };
};

export const buildInlineImageUrl = (file, baseUrl = "") => {
  const relativePath = buildRelativeUploadPath(file?.path || "");
  if (!relativePath) {
    throw { status: 500, message: "Uploaded image path could not be resolved." };
  }

  return buildAssetUrl(baseUrl, relativePath);
};

export const listPublicBlogs = async ({ search = "", tag = "", page = 1, limit = 9, baseUrl = "" }) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(24, Math.max(1, Number.parseInt(limit, 10) || 9));
  const offset = (safePage - 1) * safeLimit;
  const params = [];
  const conditions = [
    "b.deleted_at IS NULL",
    "b.approval_status = 'approved'",
    `COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.APPROVED}') = '${BLOG_STATUS.APPROVED}'`,
  ];

  if (String(search || "").trim()) {
    params.push(`%${String(search).trim()}%`);
    const param = `$${params.length}`;
    conditions.push(`
      (
        b.title ILIKE ${param}
        OR COALESCE(b.content_json->'meta'->>'excerpt', '') ILIKE ${param}
        OR COALESCE(b.content_json->>'plainText', '') ILIKE ${param}
      )
    `);
  }

  if (String(tag || "").trim()) {
    params.push(slugify(tag));
    const param = `$${params.length}`;
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM blog_tag_mappings filter_map
        JOIN blog_tags filter_tag ON filter_tag.id = filter_map.tag_id
        WHERE filter_map.blog_id = b.id
          AND regexp_replace(lower(trim(filter_tag.name)), '[^a-z0-9]+', '-', 'g') = ${param}
      )
    `);
  }

  const whereClause = conditions.join(" AND ");
  const { rows: countRows } = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM blogs b
      WHERE ${whereClause}
    `,
    params
  );

  const { rows } = await pool.query(
    buildBlogListQuery({
      whereClause,
      orderClause: "COALESCE(b.published_at, b.created_at) DESC",
      limitParam: `$${params.length + 1}`,
      offsetParam: `$${params.length + 2}`,
    }),
    [...params, safeLimit, offset]
  );

  const total = countRows[0]?.total || 0;

  return {
    blogs: rows.map((row) => mapBlogRow(row, { baseUrl })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

export const getPublicBlogBySlugOrId = async ({ slugOrId, baseUrl = "" }) => {
  const raw = String(slugOrId || "").trim();
  if (!raw) {
    throw { status: 400, message: "Blog identifier is required." };
  }

  const { rows } = await pool.query(
    buildBlogListQuery({
      whereClause: `
        b.deleted_at IS NULL
        AND b.approval_status = 'approved'
        AND COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.APPROVED}') = '${BLOG_STATUS.APPROVED}'
        AND (b.id::text = $1 OR COALESCE(b.content_json->'meta'->>'slug', '') = $1)
      `,
      limitParam: "$2",
      offsetParam: "$3",
    }),
    [raw, 1, 0]
  );

  if (!rows.length) {
    throw { status: 404, message: "Blog not found." };
  }

  return mapBlogRow(rows[0], { baseUrl, includeContent: true });
};

export const listAuthorBlogs = async ({ authorId, baseUrl = "" }) => {
  const normalizedAuthorId = Number.parseInt(authorId, 10);
  if (!Number.isInteger(normalizedAuthorId)) {
    throw { status: 400, message: "Invalid author id." };
  }

  const { rows } = await pool.query(
    buildBlogListQuery({
      whereClause: "b.author_id = $1 AND b.deleted_at IS NULL",
      orderClause: "b.updated_at DESC",
      limitParam: "$2",
      offsetParam: "$3",
    }),
    [normalizedAuthorId, 200, 0]
  );

  return rows.map((row) => mapBlogRow(row, { baseUrl, includeReview: true, includeContent: true }));
};

export const getAuthorBlog = async ({ blogId, requesterId, requesterRole, baseUrl = "" }) => {
  const safeBlogId = Number.parseInt(blogId, 10);
  if (!Number.isInteger(safeBlogId)) {
    throw { status: 400, message: "Invalid blog id." };
  }

  const record = await getBlogAccessRecord(pool, safeBlogId);
  if (!record) {
    throw { status: 404, message: "Blog not found." };
  }

  if (!isAdminRole(requesterRole) && Number(record.author_id) !== Number(requesterId)) {
    throw { status: 403, message: "You are not allowed to access this blog." };
  }

  const blog = await fetchBlogById({ blogId: safeBlogId, baseUrl, includeContent: true, includeReview: true });
  if (!blog) {
    throw { status: 404, message: "Blog not found." };
  }

  return blog;
};

export const createBlog = async ({ authorId, payload, coverImageFile, baseUrl = "" }) => {
  const normalizedAuthorId = Number.parseInt(authorId, 10);
  if (!Number.isInteger(normalizedAuthorId)) {
    throw { status: 401, message: "Only signed-in users can create blogs." };
  }

  const client = await pool.connect();
  const uploadedCoverPath = buildRelativeUploadPath(coverImageFile?.path || "") || null;

  try {
    await client.query("BEGIN");

    const blogPayload = buildBlogPayload({
      payload,
      coverImagePath: uploadedCoverPath,
    });
    const slug = await ensureUniqueSlug(client, blogPayload.title);
    const contentJson = buildBlogContentJson({
      plainText: blogPayload.plainText,
      slug,
      excerpt: blogPayload.excerpt,
      readTimeMinutes: blogPayload.readTimeMinutes,
      status: blogPayload.status,
    });

    const { rows } = await client.query(
      `
        INSERT INTO blogs (
          title,
          content_html,
          content_json,
          author_id,
          cover_image_url,
          created_at,
          updated_at,
          published_at,
          approval_status
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW(), NULL, 'pending')
        RETURNING id
      `,
      [
        blogPayload.title,
        blogPayload.contentHtml,
        JSON.stringify(contentJson),
        normalizedAuthorId,
        blogPayload.coverImagePath,
      ]
    );

    const blogId = rows[0]?.id;
    await syncBlogTags(client, blogId, blogPayload.tags);
    await client.query("COMMIT");

    const blog = await fetchBlogById({ blogId, baseUrl, includeContent: true, includeReview: true });

    return {
      message:
        blogPayload.status === BLOG_STATUS.PENDING
          ? "Blog submitted for admin approval."
          : "Blog draft saved successfully.",
      blog,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (uploadedCoverPath) {
      await deleteRelativeUpload(uploadedCoverPath);
    }
    throw { status: error?.status || 500, message: error?.message || "Unable to create blog." };
  } finally {
    client.release();
  }
};

export const updateBlog = async ({ blogId, requesterId, requesterRole, payload, coverImageFile, baseUrl = "" }) => {
  const safeBlogId = Number.parseInt(blogId, 10);
  if (!Number.isInteger(safeBlogId)) {
    throw { status: 400, message: "Invalid blog id." };
  }

  const client = await pool.connect();
  const uploadedCoverPath = buildRelativeUploadPath(coverImageFile?.path || "") || null;

  try {
    await client.query("BEGIN");
    const existingBlog = await getBlogAccessRecord(client, safeBlogId);

    if (!existingBlog) {
      throw { status: 404, message: "Blog not found." };
    }
    if (!isAdminRole(requesterRole) && Number(existingBlog.author_id) !== Number(requesterId)) {
      throw { status: 403, message: "You are not allowed to edit this blog." };
    }

    const existingMeta = getBlogMeta(existingBlog.content_json);
    const blogPayload = buildBlogPayload({
      payload,
      coverImagePath: uploadedCoverPath,
      existingBlog,
    });
    const slug = await ensureUniqueSlug(client, blogPayload.title, safeBlogId);
    const nextContentJson = buildBlogContentJson({
      plainText: blogPayload.plainText,
      slug,
      excerpt: blogPayload.excerpt,
      readTimeMinutes: blogPayload.readTimeMinutes,
      status: blogPayload.status,
      reviewNotes: blogPayload.status === BLOG_STATUS.DRAFT ? "" : existingMeta.reviewNotes || "",
      reviewedBy: blogPayload.status === BLOG_STATUS.DRAFT ? null : existingMeta.reviewedBy || null,
      reviewedAt: blogPayload.status === BLOG_STATUS.DRAFT ? null : existingMeta.reviewedAt || null,
      featured: existingMeta.featured || false,
    });

    await client.query(
      `
        UPDATE blogs
        SET
          title = $1,
          content_html = $2,
          content_json = $3::jsonb,
          cover_image_url = $4,
          approval_status = 'pending',
          published_at = NULL,
          updated_at = NOW()
        WHERE id = $5
      `,
      [
        blogPayload.title,
        blogPayload.contentHtml,
        JSON.stringify(nextContentJson),
        blogPayload.coverImagePath,
        safeBlogId,
      ]
    );

    await syncBlogTags(client, safeBlogId, blogPayload.tags);
    await client.query("COMMIT");

    if (uploadedCoverPath && existingBlog.cover_image_url && existingBlog.cover_image_url !== uploadedCoverPath) {
      await deleteRelativeUpload(existingBlog.cover_image_url);
    }
    if (blogPayload.removeCoverImage && existingBlog.cover_image_url) {
      await deleteRelativeUpload(existingBlog.cover_image_url);
    }

    const blog = await fetchBlogById({ blogId: safeBlogId, baseUrl, includeContent: true, includeReview: true });

    return {
      message:
        blogPayload.status === BLOG_STATUS.PENDING
          ? "Blog updated and submitted for approval."
          : "Blog draft updated successfully.",
      blog,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (uploadedCoverPath) {
      await deleteRelativeUpload(uploadedCoverPath);
    }
    throw { status: error?.status || 500, message: error?.message || "Unable to update blog." };
  } finally {
    client.release();
  }
};

export const listModerationBlogs = async ({ status = "", search = "", baseUrl = "" }) => {
  const params = [];
  const conditions = ["b.deleted_at IS NULL"];
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "pending") {
    conditions.push(`COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.PENDING}') = '${BLOG_STATUS.PENDING}'`);
  } else if (normalizedStatus === "approved") {
    conditions.push(`COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.APPROVED}') = '${BLOG_STATUS.APPROVED}'`);
  } else if (normalizedStatus === "draft") {
    conditions.push(`COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.DRAFT}') = '${BLOG_STATUS.DRAFT}'`);
  } else if (normalizedStatus === "rejected") {
    conditions.push(`COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.REJECTED}') = '${BLOG_STATUS.REJECTED}'`);
  }

  if (String(search || "").trim()) {
    params.push(`%${String(search).trim()}%`);
    const param = `$${params.length}`;
    conditions.push(`
      (
        b.title ILIKE ${param}
        OR author.full_name ILIKE ${param}
        OR COALESCE(b.content_json->'meta'->>'excerpt', '') ILIKE ${param}
      )
    `);
  }

  const { rows } = await pool.query(
    buildBlogListQuery({
      whereClause: conditions.join(" AND "),
      orderClause: `
        CASE
          WHEN COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.PENDING}') = '${BLOG_STATUS.PENDING}' THEN 0
          WHEN COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.REJECTED}') = '${BLOG_STATUS.REJECTED}' THEN 1
          WHEN COALESCE(b.content_json->'meta'->>'status', '${BLOG_STATUS.DRAFT}') = '${BLOG_STATUS.DRAFT}' THEN 2
          ELSE 3
        END,
        b.updated_at DESC
      `,
      limitParam: `$${params.length + 1}`,
      offsetParam: `$${params.length + 2}`,
    }),
    [...params, 300, 0]
  );

  return rows.map((row) => mapBlogRow(row, { baseUrl, includeReview: true, includeContent: true }));
};

export const reviewBlog = async ({ blogId, reviewerId, reviewerRole, status, notes = "", baseUrl = "" }) => {
  if (!isAdminRole(reviewerRole)) {
    throw { status: 403, message: "Only admins can review blogs." };
  }

  const safeBlogId = Number.parseInt(blogId, 10);
  const safeReviewerId = Number.parseInt(reviewerId, 10);
  if (!Number.isInteger(safeBlogId)) {
    throw { status: 400, message: "Invalid blog id." };
  }

  const decision = String(status || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(decision)) {
    throw { status: 400, message: "Review status must be approved or rejected." };
  }

  const nextStatus = decision === "approved" ? BLOG_STATUS.APPROVED : BLOG_STATUS.REJECTED;
  const reviewNotes = clamp(notes, 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingBlog = await getBlogAccessRecord(client, safeBlogId);
    if (!existingBlog) {
      throw { status: 404, message: "Blog not found." };
    }

    const reviewer = Number.isInteger(safeReviewerId) ? await getUserSummary(client, safeReviewerId) : null;
    const existingContent = parseJsonObject(existingBlog.content_json, {});
    const meta = getBlogMeta(existingContent);
    const nextContentJson = {
      ...existingContent,
      plainText: existingContent.plainText || "",
      meta: {
        ...meta,
        status: nextStatus,
        reviewNotes,
        reviewedBy: reviewer ? { id: reviewer.id, name: reviewer.name } : null,
        reviewedAt: new Date().toISOString(),
        featured: Boolean(meta.featured),
      },
    };

    await client.query(
      `
        UPDATE blogs
        SET
          approval_status = $1::approval_status_enum,
          content_json = $2::jsonb,
          published_at = CASE WHEN $1::text = 'approved' THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE id = $3
      `,
      [decision, JSON.stringify(nextContentJson), safeBlogId]
    );

    await client.query("COMMIT");

    const blog = await fetchBlogById({ blogId: safeBlogId, baseUrl, includeContent: true, includeReview: true });

    return {
      message: nextStatus === BLOG_STATUS.APPROVED ? "Blog approved successfully." : "Blog rejected successfully.",
      blog,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw { status: error?.status || 500, message: error?.message || "Unable to review blog." };
  } finally {
    client.release();
  }
};

export const getBlogStats = async () => {
  const { rows } = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total_blogs,
        COUNT(*) FILTER (
          WHERE COALESCE(content_json->'meta'->>'status', '${BLOG_STATUS.PENDING}') = '${BLOG_STATUS.PENDING}'
            AND deleted_at IS NULL
        )::int AS pending_blogs,
        COUNT(*) FILTER (
          WHERE COALESCE(content_json->'meta'->>'status', '${BLOG_STATUS.APPROVED}') = '${BLOG_STATUS.APPROVED}'
            AND deleted_at IS NULL
        )::int AS approved_blogs,
        COUNT(*) FILTER (
          WHERE COALESCE(content_json->'meta'->>'status', '${BLOG_STATUS.DRAFT}') = '${BLOG_STATUS.DRAFT}'
            AND deleted_at IS NULL
        )::int AS draft_blogs,
        COUNT(*) FILTER (
          WHERE COALESCE(content_json->'meta'->>'status', '${BLOG_STATUS.REJECTED}') = '${BLOG_STATUS.REJECTED}'
            AND deleted_at IS NULL
        )::int AS rejected_blogs
      FROM blogs
    `
  );

  return rows[0] || {
    total_blogs: 0,
    pending_blogs: 0,
    approved_blogs: 0,
    draft_blogs: 0,
    rejected_blogs: 0,
  };
};

export const deleteBlog = async ({ blogId, requesterId, requesterRole }) => {
  const safeBlogId = Number.parseInt(blogId, 10);
  if (!Number.isInteger(safeBlogId)) {
    throw { status: 400, message: "Invalid blog id." };
  }

  const { rows } = await pool.query(
    "SELECT author_id FROM blogs WHERE id = $1 AND deleted_at IS NULL",
    [safeBlogId]
  );
  if (!rows[0]) throw { status: 404, message: "Blog not found." };
  if (!isAdminRole(requesterRole) && Number(rows[0].author_id) !== Number(requesterId)) {
    throw { status: 403, message: "You are not allowed to delete this blog." };
  }

  await pool.query("UPDATE blogs SET deleted_at = NOW() WHERE id = $1", [safeBlogId]);
};
