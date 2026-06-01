const db = require('../config/db');

// LẤY CẤU HÌNH
exports.getConfig = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM config LIMIT 1');
    if (rows.length === 0) {
      // Tạo row mặc định nếu chưa có
      await db.query(
        `INSERT INTO config (ten_quan, tax_rate, payment_methods, invoice_template)
         VALUES (?, ?, ?, ?)`,
        ['RESTO DELUXE', 10, 'tien_mat,chuyen_khoan', JSON.stringify({
          footer: 'Cảm ơn quý khách và hẹn gặp lại!',
          contact: '123 Đường Ẩm Thực, Quận 1, TP. HCM',
        })]
      );
      const [newRows] = await db.query('SELECT * FROM config LIMIT 1');
      return res.json(newRows[0]);
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// CẬP NHẬT CẤU HÌNH
exports.updateConfig = async (req, res) => {
  const { ten_quan, tax_rate, payment_methods, footer_text, contact_info, bank_id, account_no, account_name } = req.body;
  try {
    const invoice_template = JSON.stringify({ 
      footer: footer_text, 
      contact: contact_info,
      bank_id: bank_id || 'VCB',
      account_no: account_no || '1049144528',
      account_name: account_name || 'PHAM TRUONG PHAT'
    });

    await db.query(
      `UPDATE config SET
        ten_quan = ?,
        tax_rate = ?,
        payment_methods = ?,
        invoice_template = ?
       WHERE id = 1`,
      [ten_quan, tax_rate, payment_methods, invoice_template]
    );
    res.json({ message: 'Lưu cấu hình thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// LẤY IP LAN CỦA MÁY CHỦ
exports.getServerIP = async (req, res) => {
  const os = require('os');
  try {
    const interfaces = os.networkInterfaces();
    let bestIP = '';
    let backupIP = '';
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          const ip = net.address;
          // Ưu tiên các dải IP local Wi-Fi/LAN chuẩn: 192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
            bestIP = ip;
            break;
          } else {
            backupIP = ip;
          }
        }
      }
      if (bestIP) break;
    }
    res.json({ ip: bestIP || backupIP || '127.0.0.1' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


