const db = require('../config/db');

function emitTableListUpdated(req, payload = {}) {
  req.io?.to('admin').emit('TABLE_LIST_UPDATED', payload);
  req.io?.to('staff').emit('TABLE_LIST_UPDATED', payload);
}

function emitTableStatusUpdated(req, payload) {
  req.io?.to('admin').emit('TABLE_STATUS_UPDATED', payload);
  req.io?.to('staff').emit('TABLE_STATUS_UPDATED', payload);
}

// LẤY TẤT CẢ BÀN
exports.getAllTables = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, a.name as area_name 
      FROM tables t
      LEFT JOIN areas a ON t.area_id = a.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY 1 BÀN
exports.getTableById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM tables WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bàn!' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// THÊM BÀN
exports.createTable = async (req, res) => {
  const { name, area_id } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO tables (name, area_id) VALUES (?, ?)',
      [name, area_id]
    );
    res.status(201).json({ 
      message: 'Thêm bàn thành công!', 
      id: result.insertId 
    });
    emitTableListUpdated(req, { table_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// SỬA BÀN
exports.updateTable = async (req, res) => {
  const { name, area_id } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE tables SET name=?, area_id=? WHERE id=?',
      [name, area_id, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bàn!' });
    }
    res.json({ message: 'Cập nhật bàn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// XÓA BÀN
exports.deleteTable = async (req, res) => {
  const tableId = req.params.id;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [tables] = await connection.query(
      'SELECT id, name FROM tables WHERE id = ?',
      [tableId]
    );

    if (tables.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy bàn!' });
    }

    const [activeOrders] = await connection.query(
      `SELECT id FROM orders
       WHERE table_id = ?
       AND status IN ("dang_goi", "cho_thanh_toan")`,
      [tableId]
    );

    if (activeOrders.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: 'Không thể xóa bàn đang có order chưa hoàn tất.',
      });
    }

    const [activeReservations] = await connection.query(
      `SELECT id FROM reservations
       WHERE table_id = ?
       AND status = "cho"`,
      [tableId]
    );

    if (activeReservations.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: 'Không thể xóa bàn đang có lịch đặt bàn.',
      });
    }

    await connection.query(
      'UPDATE orders SET table_id = NULL WHERE table_id = ?',
      [tableId]
    );
    await connection.query(
      'UPDATE reservations SET table_id = NULL WHERE table_id = ?',
      [tableId]
    );

    await connection.query('DELETE FROM tables WHERE id = ?', [tableId]);
    await connection.commit();

    res.json({ message: 'Xóa bàn thành công!' });
    emitTableListUpdated(req, { table_id: Number(tableId) });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    connection.release();
  }
};

// CẬP NHẬT TRẠNG THÁI BÀN
exports.updateStatus = async (req, res) => {
  const { status, reserved_at } = req.body;
  try {
    if (status === 'da_dat') {
      await db.query(
        'UPDATE tables SET status=?, reserved_at=? WHERE id=?',
        [status, reserved_at || null, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE tables SET status=?, reserved_at=NULL WHERE id=?',
        [status, req.params.id]
      );

      // Nếu đóng bàn (chuyển sang trong), kiểm tra và cập nhật trạng thái đơn hàng tương ứng
      if (status === 'trong') {
        const [activeOrders] = await db.query(
          'SELECT id FROM orders WHERE table_id=? AND status IN ("dang_goi", "cho_thanh_toan")',
          [req.params.id]
        );
        
        for (const order of activeOrders) {
          const orderId = order.id;
          
          // Kiểm tra xem có món nào đã được ra bàn (status = "hoan_thanh") chưa
          const [servedItems] = await db.query(
            'SELECT id FROM order_items WHERE order_id=? AND status="hoan_thanh" LIMIT 1',
            [orderId]
          );
          
          if (servedItems.length > 0) {
            // Nếu đã ra món: Cập nhật thành Chờ thanh toán, chưa chọn phương thức thanh toán
            await db.query(
              'UPDATE orders SET status="cho_thanh_toan", paid_at=NULL, payment_method=NULL WHERE id=?',
              [orderId]
            );
          } else {
            // Nếu chưa ra món nào: Cập nhật thành Đã hủy
            await db.query(
              'UPDATE orders SET status="huy" WHERE id=?',
              [orderId]
            );
          }
        }
      }
    }
    emitTableStatusUpdated(req, {
      table_id: Number(req.params.id),
      status,
      reserved_at: status === 'da_dat' ? reserved_at : null,
    });
    res.json({ message: 'Cập nhật trạng thái bàn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ĐẶT BÀN TRƯỚC
exports.createReservation = async (req, res) => {
  const { table_id, customer_name, phone, arrive_time, num_guests } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO reservations 
        (table_id, customer_name, phone, arrive_time, num_guests) 
       VALUES (?, ?, ?, ?, ?)`,
      [table_id, customer_name, phone, arrive_time, num_guests]
    );
    // Cập nhật trạng thái bàn thành "da_dat"
    await db.query(
      'UPDATE tables SET status="da_dat" WHERE id=?', [table_id]
    );
    emitTableStatusUpdated(req, {
      table_id: Number(table_id),
      status: 'da_dat',
      reservation_id: result.insertId,
    });
    res.status(201).json({ 
      message: 'Đặt bàn thành công!', 
      id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY TẤT CẢ ĐẶT BÀN
exports.getAllReservations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, t.name as table_name, t.status as table_status
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      ORDER BY r.arrive_time ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
exports.getAllAreas = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM areas');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
exports.createArea = async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO areas (name) VALUES (?)', [name]
    );
    
    res.status(201).json({ message: 'Thêm khu vực thành công!', id: result.insertId, name: name });
    emitTableListUpdated(req, { area_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.deleteArea = async (req, res) => {
  try {
    await db.query('DELETE FROM areas WHERE id=?', [req.params.id]);
    res.json({ message: 'Xóa khu vực thành công!' });
    emitTableListUpdated(req, { area_id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

