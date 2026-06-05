
const db = require('../config/db');

function startReservationJob(io) {
  async function checkUpcomingReservations() {
    try {
      // Lấy các reservation sắp đến trong 1 tiếng, bàn còn trống
      const [rows] = await db.query(`
        SELECT r.id, r.table_id, r.arrive_time
        FROM reservations r
        JOIN tables t ON r.table_id = t.id
        WHERE r.status = 'cho'
          AND t.status = 'trong'
          AND r.arrive_time <= DATE_ADD(NOW(), INTERVAL 1 HOUR)
          AND r.arrive_time > NOW()
      `);

      for (const reservation of rows) {
        await db.query(
          'UPDATE tables SET status = "da_dat", reserved_at = ? WHERE id = ?',
          [reservation.arrive_time, reservation.table_id]
        );

        // Emit realtime cho tất cả client
        io.to('admin').emit('TABLE_STATUS_UPDATED', {
          table_id: Number(reservation.table_id),
          status: 'da_dat',
        });
        io.to('staff').emit('TABLE_STATUS_UPDATED', {
          table_id: Number(reservation.table_id),
          status: 'da_dat',
        });

        console.log(`[ReservationJob] Bàn ${reservation.table_id} → da_dat (khách đến lúc ${reservation.arrive_time})`);
      }
    } catch (err) {
      console.error('[ReservationJob] Lỗi:', err.message);
    }
  }

  // Chạy ngay khi khởi động
  checkUpcomingReservations();

  // Chạy mỗi 5 phút
  setInterval(checkUpcomingReservations, 1 * 60 * 1000);

  console.log('[ReservationJob] Đã khởi động, kiểm tra mỗi 5 phút.');
}

module.exports = { startReservationJob };
