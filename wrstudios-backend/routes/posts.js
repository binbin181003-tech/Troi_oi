// wrstudios-backend/routes/posts.js - SQL Server version (giữ nguyên logic/chức năng)
import express from "express";
import sql from "mssql";
import db from "../config/database.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// helper: bind params
const bindParams = (request, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request;
};

// GET /api/posts - Lấy tất cả posts (phân trang)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    console.log(`📄 Fetching posts: page=${page}, limit=${limit}`);

    const pool = await db;

    // Tổng số bài
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM posts
      WHERE ISNULL(status, 'pending') <> 'deleted'
    `);
    const total = totalResult.recordset[0]?.total || 0;

    // Posts + thống kê comment/image + rating
    const postsResult = await bindParams(pool.request(), { offset, limit }).query(`
      SELECT
        p.*,
        u.name AS author_name,
        u.email AS author_email,
        ISNULL(c.comment_count, 0) AS comments_count,
        ISNULL(i.image_count, 0) AS image_count,
        thumb.thumbnail,
        ISNULL(r.avg_rating, 0) AS average_rating,
        ISNULL(r.total_reviews, 0) AS total_reviews
      FROM posts p
      LEFT JOIN users u ON u.user_id = p.user_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS comment_count
        FROM comment
        GROUP BY post_id
      ) c ON c.post_id = p.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS image_count
        FROM images
        GROUP BY post_id
      ) i ON i.post_id = p.post_id
      LEFT JOIN (
        SELECT post_id, AVG(CAST(rating AS FLOAT)) AS avg_rating, COUNT(*) AS total_reviews
        FROM comment
        WHERE rating IS NOT NULL
        GROUP BY post_id
      ) r ON r.post_id = p.post_id
      OUTER APPLY (
        SELECT TOP 1 img_url AS thumbnail
        FROM images im
        WHERE im.post_id = p.post_id
        ORDER BY im.image_id ASC
      ) thumb
      WHERE ISNULL(p.status, 'pending') <> 'deleted'
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const posts = postsResult.recordset || [];

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id - Lấy chi tiết 1 post
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    const postResult = await bindParams(pool.request(), { id }).query(`
      SELECT
        p.*,
        u.name AS author_name,
        u.email AS author_email,
        ISNULL(c.comment_count, 0) AS comments_count,
        ISNULL(i.image_count, 0) AS image_count,
        thumb.thumbnail,
        ISNULL(r.avg_rating, 0) AS average_rating,
        ISNULL(r.total_reviews, 0) AS total_reviews
      FROM posts p
      LEFT JOIN users u ON u.user_id = p.user_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS comment_count
        FROM comment
        GROUP BY post_id
      ) c ON c.post_id = p.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS image_count
        FROM images
        GROUP BY post_id
      ) i ON i.post_id = p.post_id
      LEFT JOIN (
        SELECT post_id, AVG(CAST(rating AS FLOAT)) AS avg_rating, COUNT(*) AS total_reviews
        FROM comment
        WHERE rating IS NOT NULL
        GROUP BY post_id
      ) r ON r.post_id = p.post_id
      OUTER APPLY (
        SELECT TOP 1 img_url AS thumbnail
        FROM images im
        WHERE im.post_id = p.post_id
        ORDER BY im.image_id ASC
      ) thumb
      WHERE p.post_id = @id
        AND ISNULL(p.status, 'pending') <> 'deleted'
    `);

    const post = postResult.recordset?.[0];
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error("❌ Error fetching post detail:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id/images - Lấy tất cả ảnh
router.get("/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    const result = await bindParams(pool.request(), { id }).query(`
      SELECT image_id, img_url
      FROM images
      WHERE post_id = @id
      ORDER BY image_id ASC
    `);

    const images = (result.recordset || []).map((x) => x.img_url);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id/image/:index - Lấy ảnh theo index
router.get("/:id/image/:index", async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Invalid index" });
    }

    const pool = await db;
    const result = await bindParams(pool.request(), { id, idx }).query(`
      SELECT img_url
      FROM (
        SELECT img_url, ROW_NUMBER() OVER (ORDER BY image_id ASC) AS rn
        FROM images
        WHERE post_id = @id
      ) t
      WHERE t.rn = @idx + 1
    `);

    const row = result.recordset?.[0];
    if (!row) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    res.json({ success: true, data: { img_url: row.img_url } });
  } catch (error) {
    console.error("❌ Error fetching image by index:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts - Tạo post mới
router.post("/", verifyToken, async (req, res) => {
  const tx = new sql.Transaction(await db);

  try {
    const {
      title,
      description,
      address,
      price,
      area,
      images = [],
      post_type,
      category,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const actualPostType = post_type || "listing";
    if (actualPostType === "listing" && (!images || images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Listings must have at least 1 image",
      });
    }

    if (actualPostType === "article" && !description) {
      return res.status(400).json({
        success: false,
        message: "Article must have description/content",
      });
    }

    const post_id = `post_${Date.now()}`;
    const status = "pending";
    const user_id = req.user?.user_id || req.user?.id || null;

    await tx.begin();

    const reqPost = new sql.Request(tx);
    bindParams(reqPost, {
      post_id,
      title,
      description: description || null,
      address: address || null,
      price: price ?? null,
      area: area ?? null,
      user_id,
      status,
      post_type: actualPostType,
      category: category || "studio",
    });

    await reqPost.query(`
      INSERT INTO posts (
        post_id, title, description, address, price, area, user_id, status, post_type, category, created_at, updated_at
      )
      VALUES (
        @post_id, @title, @description, @address, @price, @area, @user_id, @status, @post_type, @category, GETDATE(), GETDATE()
      )
    `);

    // lưu images
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image_id = `img_${Date.now()}_${i}`;
        const reqImg = new sql.Request(tx);
        bindParams(reqImg, {
          image_id,
          post_id,
          img_url: images[i],
        });

        await reqImg.query(`
          INSERT INTO images (image_id, post_id, img_url)
          VALUES (@image_id, @post_id, @img_url)
        `);
      }
    }

    await tx.commit();

    res.status(201).json({
      success: true,
      message: "Post created",
      post_id,
    });
  } catch (error) {
    await tx.rollback();
    console.error("❌ Error creating post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/posts/:id - Cập nhật post
router.put("/:id", verifyToken, async (req, res) => {
  const tx = new sql.Transaction(await db);

  try {
    const { id } = req.params;
    const {
      title,
      description,
      address,
      price,
      area,
      images,
      post_type,
      category,
      status,
    } = req.body;

    await tx.begin();

    // check ownership/admin
    const reqCheck = new sql.Request(tx);
    bindParams(reqCheck, { id });
    const checkResult = await reqCheck.query(`
      SELECT user_id FROM posts WHERE post_id = @id
    `);
    const existing = checkResult.recordset?.[0];

    if (!existing) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isOwner = existing.user_id === (req.user?.user_id || req.user?.id);
    const isAdminRole = req.user?.role === "admin";
    if (!isOwner && !isAdminRole) {
      await tx.rollback();
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const reqUpdate = new sql.Request(tx);
    bindParams(reqUpdate, {
      id,
      title: title ?? null,
      description: description ?? null,
      address: address ?? null,
      price: price ?? null,
      area: area ?? null,
      post_type: post_type ?? null,
      category: category ?? null,
      status: status ?? null,
    });

    await reqUpdate.query(`
      UPDATE posts
      SET
        title = COALESCE(@title, title),
        description = COALESCE(@description, description),
        address = COALESCE(@address, address),
        price = COALESCE(@price, price),
        area = COALESCE(@area, area),
        post_type = COALESCE(@post_type, post_type),
        category = COALESCE(@category, category),
        status = COALESCE(@status, status),
        updated_at = GETDATE()
      WHERE post_id = @id
    `);

    // nếu có images mới -> thay toàn bộ images cũ
    if (Array.isArray(images)) {
      const reqDel = new sql.Request(tx);
      bindParams(reqDel, { id });
      await reqDel.query(`DELETE FROM images WHERE post_id = @id`);

      for (let i = 0; i < images.length; i++) {
        const reqImg = new sql.Request(tx);
        bindParams(reqImg, {
          image_id: `img_${Date.now()}_${i}`,
          post_id: id,
          img_url: images[i],
        });
        await reqImg.query(`
          INSERT INTO images (image_id, post_id, img_url)
          VALUES (@image_id, @post_id, @img_url)
        `);
      }
    }

    await tx.commit();
    res.json({ success: true, message: "Post updated" });
  } catch (error) {
    await tx.rollback();
    console.error("❌ Error updating post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/posts/:id - soft delete
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    // check ownership/admin
    const check = await bindParams(pool.request(), { id }).query(`
      SELECT user_id FROM posts WHERE post_id = @id
    `);
    const existing = check.recordset?.[0];

    if (!existing) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isOwner = existing.user_id === (req.user?.user_id || req.user?.id);
    const isAdminRole = req.user?.role === "admin";
    if (!isOwner && !isAdminRole) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await bindParams(pool.request(), { id }).query(`
      UPDATE posts
      SET status = 'deleted', updated_at = GETDATE()
      WHERE post_id = @id
    `);

    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/posts/:id/approve
router.patch("/:id/approve", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    await bindParams(pool.request(), { id }).query(`
      UPDATE posts
      SET status = 'approved', updated_at = GETDATE()
      WHERE post_id = @id
    `);

    res.json({ success: true, message: "Post approved" });
  } catch (error) {
    console.error("❌ Error approving post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/posts/:id/reject
router.patch("/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    await bindParams(pool.request(), { id }).query(`
      UPDATE posts
      SET status = 'rejected', updated_at = GETDATE()
      WHERE post_id = @id
    `);

    res.json({ success: true, message: "Post rejected" });
  } catch (error) {
    console.error("❌ Error rejecting post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/posts/:id/restore
router.patch("/:id/restore", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    await bindParams(pool.request(), { id }).query(`
      UPDATE posts
      SET status = 'approved', updated_at = GETDATE()
      WHERE post_id = @id
    `);

    res.json({ success: true, message: "Post restored" });
  } catch (error) {
    console.error("❌ Error restoring post:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/posts/:id/increment-view
router.patch("/:id/increment-view", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    await bindParams(pool.request(), { id }).query(`
      UPDATE posts
      SET views = ISNULL(views, 0) + 1, updated_at = GETDATE()
      WHERE post_id = @id
    `);

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error incrementing view:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/posts/:id/comments - lấy comments theo post (tree build ở FE)
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;

    const result = await bindParams(pool.request(), { id }).query(`
      SELECT
        c.comment_id,
        c.user_id,
        c.post_id,
        c.content,
        c.parent_comment_id,
        c.rating,
        c.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM comment c
      LEFT JOIN users u ON u.user_id = c.user_id
      WHERE c.post_id = @id
      ORDER BY c.created_at ASC
    `);

    res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error("❌ Error fetching comments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/posts/:id/comments - thêm comment/rating
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_comment_id = null, rating = null } = req.body;
    const user_id = req.user?.user_id || req.user?.id;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const pool = await db;
    const comment_id = `cmt_${Date.now()}`;

    await bindParams(pool.request(), {
      comment_id,
      user_id,
      post_id: id,
      content: String(content).trim(),
      parent_comment_id,
      rating,
    }).query(`
      INSERT INTO comment (comment_id, user_id, post_id, content, parent_comment_id, rating, created_at)
      VALUES (@comment_id, @user_id, @post_id, @content, @parent_comment_id, @rating, GETDATE())
    `);

    res.status(201).json({ success: true, comment_id });
  } catch (error) {
    console.error("❌ Error adding comment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;