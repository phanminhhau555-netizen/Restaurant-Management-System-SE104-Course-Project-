const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { hideMenuItemsWithOutOfStockIngredients } = require('../services/menuAvailabilityService');
const {
  getMenuItemAvailability,
  getMenuItemsAvailabilityMap,
} = require('../services/orderInventoryService');

async function verifyQrToken(req, res, next) {
  try {
    const [tables] = await db.query(
      'SELECT id, name, status FROM tables WHERE qr_token=?',
      [req.params.token]
    );

    if (tables.length === 0) {
      return res.status(403).json({ message: 'QR không hợp lệ!' });
    }

    req.qrTable = tables[0];
    next();
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

async function updateOrderTotal(orderId, connection = db) {
  await connection.query(`
    UPDATE orders SET total_amount = (
      SELECT COALESCE(SUM(price * quantity), 0)
      FROM order_items
      WHERE order_id = ? AND status != "huy"
    ) WHERE id = ?
  `, [orderId, orderId]);
}

async function getActiveOrderByTable(tableId, connection = db) {
  const [orders] = await connection.query(
    `SELECT o.*, t.name as table_name
     FROM orders o
     LEFT JOIN tables t ON o.table_id = t.id
     WHERE o.table_id = ? AND o.status = "dang_goi"
     ORDER BY o.created_at ASC
     LIMIT 1`,
    [tableId]
  );

  return orders[0] || null;
}

async function getOrCreateActiveOrder(tableId, connection = db) {
  const activeOrder = await getActiveOrderByTable(tableId, connection);
  if (activeOrder) return activeOrder.id;

  await connection.query(
    'UPDATE tables SET status="dang_dung" WHERE id=?',
    [tableId]
  );

  const [result] = await connection.query(
    'INSERT INTO orders (table_id, account_id, customer_id) VALUES (?, NULL, NULL)',
    [tableId]
  );

  return result.insertId;
}

router.get('/tables/:token', verifyQrToken, async (req, res) => {
  res.json(req.qrTable);
});

router.get('/menu', async (req, res) => {
  try {
    await hideMenuItemsWithOutOfStockIngredients(db);
    const availabilityMap = await getMenuItemsAvailabilityMap(db);

    const [rows] = await db.query(`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      ORDER BY c.name, m.name
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
});

router.get('/menu/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

router.get('/orders/:token/active', verifyQrToken, async (req, res) => {
  try {
    const activeOrder = await getActiveOrderByTable(req.qrTable.id);
    res.json(activeOrder ? [activeOrder] : []);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

router.get('/orders/:token/detail', verifyQrToken, async (req, res) => {
  try {
    const activeOrder = await getActiveOrderByTable(req.qrTable.id);
    if (!activeOrder) {
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }

    const [items] = await db.query(`
      SELECT oi.*, m.name as mon_ten
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id=?
    `, [activeOrder.id]);

    res.json({ ...activeOrder, items });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

router.post('/orders/:token', verifyQrToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const orderId = await getOrCreateActiveOrder(req.qrTable.id, connection);
    await connection.commit();

    res.status(201).json({
      message: 'Tạo order thành công!',
      order_id: orderId,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    connection.release();
  }
});

router.post('/orders/:token/items', verifyQrToken, async (req, res) => {
  const { menu_item_id, quantity, note, status } = req.body;
  const requestedQuantity = Number(quantity);

  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({ message: 'Số lượng món phải lớn hơn 0!' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const orderId = await getOrCreateActiveOrder(req.qrTable.id, connection);

    const [menuItem] = await connection.query(
      'SELECT price FROM menu_items WHERE id=? AND is_visible=1',
      [menu_item_id]
    );

    if (menuItem.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }

    await connection.query(
      `SELECT i.id
       FROM recipes r
       JOIN ingredients i ON i.id = r.ingredient_id
       WHERE r.menu_item_id = ?
       FOR UPDATE`,
      [menu_item_id]
    );

    const availability = await getMenuItemAvailability(connection, menu_item_id);
    const allowedQuantity = availability.max_quantity === null
      ? requestedQuantity
      : Math.min(requestedQuantity, availability.max_quantity);

    if (allowedQuantity <= 0) {
      await connection.rollback();
      const ingredientName = availability.limiting_ingredients?.[0]?.ingredient_name || 'nguyên liệu';
      return res.status(409).json({
        message: `Không thể thêm món này vì ${ingredientName} đã hết hoặc đã được giữ cho order khác.`,
        requested_quantity: requestedQuantity,
        allowed_quantity: 0,
        max_quantity: 0,
      });
    }

    const unitPrice = Math.round(Number(menuItem[0].price) || 0);

    await connection.query(
      `INSERT INTO order_items
        (order_id, menu_item_id, quantity, price, note, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, menu_item_id, allowedQuantity, unitPrice, note || null, status || 'cho']
    );

    await updateOrderTotal(orderId, connection);
    await connection.commit();

    const adjusted = allowedQuantity < requestedQuantity;
    res.status(201).json({
      message: adjusted
        ? `Kho chỉ đủ ${allowedQuantity}, hệ thống đã thêm số lượng tối đa có thể.`
        : 'Thêm món thành công!',
      requested_quantity: requestedQuantity,
      added_quantity: allowedQuantity,
      max_quantity: availability.max_quantity,
      inventory_adjusted: adjusted,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/orders/:token/items/:itemId', verifyQrToken, async (req, res) => {
  try {
    const activeOrder = await getActiveOrderByTable(req.qrTable.id);
    if (!activeOrder) {
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }

    const [item] = await db.query(
      'SELECT id FROM order_items WHERE id=? AND order_id=?',
      [req.params.itemId, activeOrder.id]
    );

    if (item.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }

    await db.query('DELETE FROM order_items WHERE id=?', [req.params.itemId]);
    await updateOrderTotal(activeOrder.id);
    res.json({ message: 'Hủy món thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

router.post('/orders/:token/send', verifyQrToken, async (req, res) => {
  try {
    const activeOrder = await getActiveOrderByTable(req.qrTable.id);
    if (!activeOrder) {
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }

    const [items] = await db.query(
      'SELECT id FROM order_items WHERE order_id=? AND status="cho" LIMIT 1',
      [activeOrder.id]
    );

    if (items.length === 0) {
      return res.status(400).json({ message: 'Order chưa có món chờ bếp!' });
    }

    req.io?.to('kitchen').emit('NEW_KITCHEN_ORDER', {
      order_id: Number(activeOrder.id),
    });

    res.json({ message: 'Đã gửi order xuống bếp!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

module.exports = router;
