const db = require('../config/db');
const { hideMenuItemsWithOutOfStockIngredients } = require('../services/menuAvailabilityService');
const { getMenuItemsAvailabilityMap } = require('../services/orderInventoryService');

// LẤY DANH MỤC MÓN ĂN
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name
      FROM categories
      ORDER BY id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// THÊM DANH MỤC
exports.createCategory = async (req, res) => {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ message: 'Vui lòng nhập tên danh mục.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    );
    res.status(201).json({
      message: 'Thêm danh mục thành công!',
      category: { id: result.insertId, name },
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// SỬA DANH MỤC
exports.updateCategory = async (req, res) => {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ message: 'Vui lòng nhập tên danh mục.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE categories SET name = ? WHERE id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
    }
    res.json({ message: 'Cập nhật danh mục thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// XÓA DANH MỤC
exports.deleteCategory = async (req, res) => {
  try {
    const [[usage]] = await db.query(
      'SELECT COUNT(*) as total FROM menu_items WHERE category_id = ?',
      [req.params.id]
    );

    if (usage.total > 0) {
      return res.status(400).json({
        message: 'Danh mục đang có món ăn. Hãy đổi danh mục cho món trước khi xóa.',
      });
    }

    const [result] = await db.query(
      'DELETE FROM categories WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
    }
    res.json({ message: 'Xóa danh mục thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY TẤT CẢ MÓN ĂN
exports.getAllItems = async (req, res) => {
  try {
    await hideMenuItemsWithOutOfStockIngredients(db);
    const availabilityMap = await getMenuItemsAvailabilityMap(db);

    const [rows] = await db.query(`
      SELECT m.*, c.name as category_name 
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
    `);
    res.json(rows.map((row) => {
      const availability = availabilityMap.get(Number(row.id));
      return {
        ...row,
        max_order_quantity: availability ? availability.max_quantity : null,
        ingredient_availability: availability ? availability.ingredients : [],
      };
    }));
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY 1 MÓN ĂN
exports.getItemById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM menu_items WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// THÊM MÓN ĂN
exports.createItem = async (req, res) => {
  const { name, description, price, category_id, image_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO menu_items (name, description, price, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, category_id, image_url]
    );
    res.status(201).json({ 
      message: 'Thêm món ăn thành công!', 
      id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// SỬA MÓN ĂN
exports.updateItem = async (req, res) => {
  const { name, description, price, category_id, image_url, is_visible } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE menu_items 
       SET name=?, description=?, price=?, category_id=?, image_url=?, is_visible=?
       WHERE id=?`,
      [name, description, price, category_id, image_url, is_visible, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }
    res.json({ message: 'Cập nhật món ăn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// XÓA MÓN ĂN
exports.deleteItem = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM menu_items WHERE id = ?', [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }
    res.json({ message: 'Xóa món ăn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ẨN / HIỆN MÓN ĂN
exports.toggleVisibility = async (req, res) => {
  try {
    await db.query(
      'UPDATE menu_items SET is_visible = !is_visible WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Cập nhật trạng thái món ăn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
