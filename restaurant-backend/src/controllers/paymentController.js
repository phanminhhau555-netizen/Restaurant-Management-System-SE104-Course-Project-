const db = require('../config/db');
const { hideMenuItemsWithOutOfStockIngredients } = require('../services/menuAvailabilityService');
const { checkOrderItemsAvailability } = require('../services/orderInventoryService');
const { addPointsFromOrder } = require('./customerController');

const MEMBERSHIP_DISCOUNT_PERCENT = {
  thuong: 0,
  bac: 5,
  vang: 10,
};

// TÍNH TIỀN & LẬP HÓA ĐƠN
exports.getInvoice = async (req, res) => {
  const order_id = req.params.id;
  try {
    // Lấy thông tin order
    const [order] = await db.query(
      'SELECT * FROM orders WHERE id=?', [order_id]
    );
    if (order.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }

    // Lấy danh sách món
    const [items] = await db.query(`
      SELECT oi.*, m.name as mon_ten
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id=? AND oi.status != "huy"
    `, [order_id]);

    // Lấy cấu hình thuế
    const [config] = await db.query('SELECT * FROM config LIMIT 1');
    const tax_rate = config.length > 0 ? config[0].tax_rate : 0;

    const total_amount = order[0].total_amount || 0;
    const tax_amount = (total_amount * tax_rate) / 100;
    const final_amount = total_amount + tax_amount;

    res.json({
      order: order[0],
      items,
      total_amount,
      tax_rate,
      tax_amount,
      final_amount
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
// THANH TOÁN
exports.checkout = async (req, res) => {
  const order_id = req.params.id;
  const { payment_method, customer_id, items } = req.body;
  const connection = await db.getConnection();
 
  try {
    await connection.beginTransaction();
 
    // 1. Lấy thông tin order
    const [order] = await connection.query(
      'SELECT * FROM orders WHERE id=? FOR UPDATE', [order_id]
    );
    if (order.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Không tìm thấy order!' });
    }
    if (order[0].status === 'da_thanh_toan') {
      await connection.rollback();
      return res.status(400).json({ message: 'Order đã được thanh toán!' });
    }
 
    // 2. Lấy items
    const requestedItems = items && Array.isArray(items)
      ? items
      : (await connection.query(
          'SELECT menu_item_id, quantity FROM order_items WHERE order_id=? AND status != "huy"',
          [order_id]
        ))[0];
 
    // 3. Kiểm tra nguyên liệu
    const shortages = await checkOrderItemsAvailability(connection, requestedItems, {
      excludeOrderId: order_id,
    });
    if (shortages.length > 0) {
      await connection.rollback();
      const firstShortage = shortages[0];
      const ingredientName = firstShortage.limiting_ingredients?.[0]?.ingredient_name || 'nguyên liệu';
      return res.status(409).json({
        message: `Không thể thanh toán vì ${ingredientName} chỉ còn đủ cho ${firstShortage.max_quantity} phần.`,
        shortages,
      });
    }
 
    // 4. Ghi đè món ăn thực tế
    if (items && Array.isArray(items)) {
      await connection.query('DELETE FROM order_items WHERE order_id=?', [order_id]);
      for (const item of requestedItems) {
        const itemPrice = Math.round(Number(item.price) || 0);
        await connection.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price, note, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order_id, item.menu_item_id, item.quantity, itemPrice, item.note || null, 'hoan_thanh']
        );
      }
    }
 
    // 5. Tính tổng tiền
    const [sumRes] = await connection.query(
      'SELECT SUM(price * quantity) AS order_total FROM order_items WHERE order_id=? AND status != "huy"',
      [order_id]
    );
    const total = sumRes[0]?.order_total || 0;
 
    // 6. Lấy thuế
    const [config] = await connection.query('SELECT tax_rate FROM config LIMIT 1');
    const tax_rate = config.length > 0 ? config[0].tax_rate : 0;
    const tax_amount = (total * tax_rate) / 100;
    const discount = order[0].discount_amount || 0;
 
    // 7. Tính discount membership từ DB, không tin phần trăm gửi từ frontend
    let membership = null;
    if (customer_id) {
      const [customers] = await connection.query(
        'SELECT membership FROM customers WHERE id=? FOR UPDATE',
        [customer_id]
      );
      if (customers.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Không tìm thấy khách hàng!' });
      }
      membership = customers[0].membership;
    }

    const membershipDiscountPercent = MEMBERSHIP_DISCOUNT_PERCENT[membership] || 0;
    const membershipDiscount = membershipDiscountPercent > 0
      ? Math.round((total + tax_amount) * membershipDiscountPercent / 100)
      : 0;
 
    const final_amount = total + tax_amount - discount - membershipDiscount;
 
    // 8. Cập nhật order
    await connection.query(`
      UPDATE orders SET 
        status="da_thanh_toan",
        payment_method=?,
        tax_amount=?,
        total_amount=?,
        discount_amount=?,
        customer_id=?,
        paid_at=NOW()
      WHERE id=?
    `, [payment_method, tax_amount, final_amount, discount + membershipDiscount, customer_id || null, order_id]);
 
    // 9. Giải phóng bàn
    await connection.query(
      'UPDATE tables SET status="trong" WHERE id=?',
      [order[0].table_id]
    );
 
    // 10. Cộng điểm
    if (customer_id) {
      await addPointsFromOrder(customer_id, Number(order_id), final_amount, connection);
    }
 
    // 11. Trừ kho
    await deductInventory(order_id, connection);
 
    await connection.commit();
 
    const payload = { order_id: Number(order_id), table_id: order[0].table_id, status: 'trong' };
    req.io?.to('admin').emit('PAYMENT_COMPLETED', payload);
    req.io?.to('staff').emit('PAYMENT_COMPLETED', payload);
    req.io?.to('admin').emit('TABLE_STATUS_UPDATED', { table_id: order[0].table_id, status: 'trong' });
    req.io?.to('staff').emit('TABLE_STATUS_UPDATED', { table_id: order[0].table_id, status: 'trong' });
 
    res.json({
      message: 'Thanh toán thành công!',
      final_amount,
      payment_method,
      membership,
      membership_discount_percent: membershipDiscountPercent,
      membership_discount_amount: membershipDiscount,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    connection.release();
  }
};

// HỦY ORDER
exports.cancelOrder = async (req, res) => {
  const order_id = req.params.id;
  try {
    const [order] = await db.query(
      'SELECT * FROM orders WHERE id=?', [order_id]
    );
    if (!order || order.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng này!' });
    }
    if (order[0].status === 'da_thanh_toan') {
      return res.status(400).json({ message: 'Không thể hủy order đã thanh toán!' });
    }

    await db.query(
      'UPDATE orders SET status="huy" WHERE id=?', [order_id]
    );
    await db.query(
      'UPDATE tables SET status="trong" WHERE id=?',
      [order[0].table_id]
    );

    req.io?.to('admin').emit('TABLE_STATUS_UPDATED', {
      table_id: order[0].table_id,
      status: 'trong',
    });
    req.io?.to('staff').emit('TABLE_STATUS_UPDATED', {
      table_id: order[0].table_id,
      status: 'trong',
    });

    res.json({ message: 'Hủy order thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// HÀM TỰ ĐỘNG TRỪ KHO (dùng nội bộ)
async function deductInventory(order_id, executor = db) {
  const touchedIngredientIds = [];
  const [items] = await executor.query(
    'SELECT * FROM order_items WHERE order_id=? AND status="hoan_thanh"',
    [order_id]
  );
  for (const item of items) {
    const [recipes] = await executor.query(
      'SELECT * FROM recipes WHERE menu_item_id=?',
      [item.menu_item_id]
    );
    for (const recipe of recipes) {
      await executor.query(
        'UPDATE ingredients SET quantity = quantity - ? WHERE id=?',
        [recipe.amount * item.quantity, recipe.ingredient_id]
      );
      touchedIngredientIds.push(recipe.ingredient_id);
    }
  }

  await hideMenuItemsWithOutOfStockIngredients(executor, touchedIngredientIds);
}
