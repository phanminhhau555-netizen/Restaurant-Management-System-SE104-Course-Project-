const db = require('../config/db');

// BÁO CÁO DOANH THU THEO NGÀY
exports.revenueByDay = async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu,
        SUM(tax_amount) as tong_thue,
        SUM(discount_amount) as tong_giam_gia,
        payment_method
      FROM orders
      WHERE DATE(paid_at) = ? AND status = "da_thanh_toan"
      GROUP BY payment_method
    `, [targetDate]);

    const [total] = await db.query(`
      SELECT 
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu
      FROM orders
      WHERE DATE(paid_at) = ? AND status = "da_thanh_toan"
    `, [targetDate]);

    res.json({
      ngay: targetDate,
      tong_don: total[0].tong_don || 0,
      tong_doanh_thu: total[0].tong_doanh_thu || 0,
      chi_tiet_thanh_toan: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// BÁO CÁO DOANH THU THEO TUẦN
exports.revenueByWeek = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(paid_at) as ngay,
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu
      FROM orders
      WHERE paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND status = "da_thanh_toan"
      GROUP BY DATE(paid_at)
      ORDER BY ngay ASC
    `);

    const [total] = await db.query(`
      SELECT 
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu
      FROM orders
      WHERE paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND status = "da_thanh_toan"
    `);

    res.json({
      tong_don: total[0].tong_don || 0,
      tong_doanh_thu: total[0].tong_doanh_thu || 0,
      chi_tiet: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// BÁO CÁO DOANH THU THEO THÁNG
exports.revenueByMonth = async (req, res) => {
  const { month, year } = req.query;
  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(paid_at) as ngay,
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu
      FROM orders
      WHERE MONTH(paid_at) = ? AND YEAR(paid_at) = ?
        AND status = "da_thanh_toan"
      GROUP BY DATE(paid_at)
      ORDER BY ngay ASC
    `, [targetMonth, targetYear]);

    const [total] = await db.query(`
      SELECT 
        COUNT(id) as tong_don,
        SUM(total_amount) as tong_doanh_thu
      FROM orders
      WHERE MONTH(paid_at) = ? AND YEAR(paid_at) = ?
        AND status = "da_thanh_toan"
    `, [targetMonth, targetYear]);

    res.json({
      thang: `${targetMonth}/${targetYear}`,
      tong_don: total[0].tong_don || 0,
      tong_doanh_thu: total[0].tong_doanh_thu || 0,
      chi_tiet: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// BÁO CÁO MÓN ĂN BÁN CHẠY
exports.topSellingItems = async (req, res) => {
  const { limit } = req.query;
  const top = limit || 10;
  try {
    const [rows] = await db.query(`
      SELECT 
        m.name as mon_ten,
        m.price as don_gia,
        SUM(oi.quantity) as tong_so_luong,
        SUM(oi.quantity * oi.price) as tong_doanh_thu
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status = "da_thanh_toan"
        AND oi.status = "hoan_thanh"
      GROUP BY oi.menu_item_id
      ORDER BY tong_so_luong DESC
      LIMIT ?
    `, [parseInt(top)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// BÁO CÁO TỒN KHO
exports.inventoryReport = async (req, res) => {
  try {
    // Tồn kho hiện tại
    const [stock] = await db.query(`
      SELECT 
        id, name, unit, quantity, min_quantity,
        CASE 
          WHEN quantity = 0 THEN "het_hang"
          WHEN quantity <= min_quantity THEN "sap_het"
          ELSE "con_hang"
        END as trang_thai
      FROM ingredients
      ORDER BY quantity ASC
    `);

    // Tổng nhập/xuất trong tháng
    const [logs] = await db.query(`
      SELECT 
        i.name as ingredient_name,
        il.type,
        COALESCE(il.unit, i.unit) as unit,
        SUM(il.quantity) as tong_so_luong
      FROM inventory_logs il
      LEFT JOIN ingredients i ON il.ingredient_id = i.id
      WHERE MONTH(il.created_at) = MONTH(NOW())
      GROUP BY il.ingredient_id, il.type, COALESCE(il.unit, i.unit)
    `);

    res.json({
      ton_kho: stock,
      lich_su_thang_nay: logs,
      canh_bao_sap_het: stock.filter(i => i.trang_thai === 'sap_het'),
      canh_bao_het_hang: stock.filter(i => i.trang_thai === 'het_hang')
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
