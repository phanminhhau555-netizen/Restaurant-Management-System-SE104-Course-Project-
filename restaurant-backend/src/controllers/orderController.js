const db = require('../config/db');
const { getMenuItemAvailability } = require('../services/orderInventoryService');

// TẠO ORDER MỚI
exports.createOrder = async (req, res) => {
  const { table_id, customer_id } = req.body;
  try {
    const [table] = await db.query(
      'SELECT status FROM tables WHERE id=?',
      [table_id]
    );

    if (table.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bàn!' });
    }

    if (table[0].status !== 'dang_dung') {
      return res.status(409).json({
        message: 'Bàn phải chuyển sang có khách trước khi order!',
      });
    }

    const [result] = await db.query(
      `INSERT INTO orders (table_id, account_id, customer_id) VALUES (?, ?, ?)`,
      [table_id, req.user && req.user.id !== 0 ? req.user.id : null, customer_id || null]
    );

    res.status(201).json({ 
      message: 'Tạo order thành công!', 
      order_id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// THÊM MÓN VÀO ORDER
exports.addOrderItem = async (req, res) => {
  const { menu_item_id, quantity, note, status } = req.body;
  const order_id = req.params.id;
  const requestedQuantity = Number(quantity);
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({ message: 'Số lượng món phải lớn hơn 0!' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Kiểm tra trạng thái hóa đơn/order hiện tại
    const [order] = await connection.query(
      'SELECT status FROM orders WHERE id=?', [order_id]
    );
    if (order.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' });
    }
    if (order[0].status === 'da_thanh_toan' || order[0].status === 'huy') {
      await connection.rollback();
      return res.status(409).json({ message: 'Hóa đơn bàn này đã được thanh toán hoặc đã hủy, không thể thêm món mới!' });
    }

    // Lấy giá món ăn
    const [menuItem] = await connection.query(
      'SELECT price FROM menu_items WHERE id=?', [menu_item_id]
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

    // Thêm món vào order
    await connection.query(
      `INSERT INTO order_items 
        (order_id, menu_item_id, quantity, price, note, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [order_id, menu_item_id, allowedQuantity, unitPrice, note || null, status || 'cho']
    );

    // Cập nhật tổng tiền
    await updateOrderTotal(order_id, connection);

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
};

// GỬI ORDER XUỐNG BẾP
exports.sendToKitchen = async (req, res) => {
  const order_id = req.params.id;
  try {
    const [items] = await db.query(
      'SELECT id FROM order_items WHERE order_id=? AND status="cho" LIMIT 1',
      [order_id]
    );

    if (items.length === 0) {
      return res.status(400).json({ message: 'Order chưa có món chờ bếp!' });
    }

    req.io?.to('kitchen').emit('NEW_KITCHEN_ORDER', {
      order_id: Number(order_id),
    });

    res.json({ message: 'Đã gửi order xuống bếp!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.updateItemStatus = async (req, res) => {
  const { status } = req.body;

  // === FIX: Chặn dữ liệu rác bằng Whitelist trước khi đưa vào DB ===
  const ALLOWED_STATUSES = ['cho', 'dang_nau', 'hoan_thanh', 'huy'];
  
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ 
      message: `Trạng thái không hợp lệ! Chỉ chấp nhận: ${ALLOWED_STATUSES.join(', ')}` 
    });
  }

  try {
    // Thực hiện update trạng thái món
    const [result] = await db.query(
      'UPDATE order_items SET status=? WHERE id=?',
      [status, req.params.itemId]
    );

    // Kiểm tra xem itemId truyền lên có tồn tại trong DB thật không
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn này!' });
    }

    const payload = {
      order_id: Number(req.params.id),
      item_id: Number(req.params.itemId),
      status,
    };
    req.io?.to('kitchen').emit('ITEM_STATUS_UPDATED', payload);
    req.io?.to('staff').emit('ITEM_STATUS_UPDATED', payload);
    req.io?.to('admin').emit('ITEM_STATUS_UPDATED', payload);

    res.json({ message: 'Cập nhật trạng thái món thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
// SỬA / HỦY MÓN
exports.deleteOrderItem = async (req, res) => {
  try {
    // Kiểm tra xem đơn hàng đã được thanh toán hoặc đã hủy chưa
    const [order] = await db.query(
      'SELECT status FROM orders WHERE id=?', [req.params.id]
    );
    if (order.length > 0 && (order[0].status === 'da_thanh_toan' || order[0].status === 'huy')) {
      return res.status(409).json({ message: 'Hóa đơn bàn này đã được thanh toán hoặc đã hủy, không thể thay đổi món!' });
    }

    const [item] = await db.query(
      'SELECT * FROM order_items WHERE id=?', [req.params.itemId]
    );
    if (item.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
    }
    await db.query('DELETE FROM order_items WHERE id=?', [req.params.itemId]);
    await updateOrderTotal(req.params.id);
    res.json({ message: 'Hủy món thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY CHI TIẾT ORDER
exports.getOrderById = async (req, res) => {
  try {
    const [order] = await db.query(
      'SELECT * FROM orders WHERE id=?', [req.params.id]
    );
    if (order.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }
    const [items] = await db.query(`
      SELECT oi.*, m.name as mon_ten 
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id=?
    `, [req.params.id]);

    res.json({ ...order[0], items });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY TẤT CẢ ORDER ĐANG HOẠT ĐỘNG
exports.getActiveOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, t.name as table_name 
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status = "dang_goi"
      ORDER BY o.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY HÀNG ĐỢI BẾP THEO TỪNG MÓN
exports.getKitchenOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        oi.id,
        oi.order_id,
        oi.menu_item_id,
        oi.quantity,
        oi.price,
        oi.note,
        oi.status,
        m.name as mon_ten,
        m.image_url,
        o.created_at as order_created_at,
        o.status as order_status,
        o.table_id,
        t.name as table_name
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE oi.status IN ("cho", "dang_nau")
        AND o.status IN ("dang_goi", "cho_thanh_toan")
      ORDER BY o.created_at ASC, oi.id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

async function updateOrderTotal(order_id, customConnection = null) {
  const connection = customConnection || db;

  await connection.query(`
    UPDATE orders SET total_amount = COALESCE((
      SELECT SUM(price * quantity) 
      FROM order_items 
      WHERE order_id = ? AND status != "huy"
    ), 0) WHERE id = ?
  `, [order_id, order_id]);
}
// LẤY TẤT CẢ ORDER (LỊCH SỬ BÁN HÀNG)
exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, t.name as table_name, a.full_name as account_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN accounts a ON o.account_id = a.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// XÓA HOÀN TOÀN HÓA ĐƠN/ORDER VÀ CÁC MÓN ĐI KÈM
exports.deleteOrder = async (req, res) => {
  const order_id = req.params.id;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      'SELECT id, table_id, status FROM orders WHERE id=? FOR UPDATE',
      [order_id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' });
    }

    const order = orders[0];
    const shouldReleaseTable = ['dang_goi', 'cho_thanh_toan'].includes(order.status);

    await connection.query('DELETE FROM order_items WHERE order_id=?', [order_id]);

    await connection.query('DELETE FROM orders WHERE id=?', [order_id]);

    if (shouldReleaseTable && order.table_id) {
      await connection.query(
        'UPDATE tables SET status="trong" WHERE id=?',
        [order.table_id]
      );
    }

    await connection.commit();

    if (shouldReleaseTable && order.table_id) {
      const payload = {
        table_id: order.table_id,
        status: 'trong',
      };

      req.io?.to('admin').emit('TABLE_STATUS_UPDATED', payload);
      req.io?.to('staff').emit('TABLE_STATUS_UPDATED', payload);
    }

    res.json({ message: 'Xóa hóa đơn thành công!' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    connection.release();
  }
};

