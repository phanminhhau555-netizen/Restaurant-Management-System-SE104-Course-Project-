-- =========================
-- RESTAURANT DATABASE SCHEMA
-- =========================

CREATE DATABASE IF NOT EXISTS database_name;
USE database_name;

-- 1. BẢNG VAI TRÒ
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name ENUM('admin', 'ban_hang', 'bep') NOT NULL
);

-- 2. BẢNG TÀI KHOẢN NHÂN VIÊN
CREATE TABLE accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. BẢNG CẤU HÌNH QUÁN
CREATE TABLE config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ten_quan VARCHAR(100),
  tax_rate DECIMAL(5,2) DEFAULT 0,
  payment_methods VARCHAR(255),
  invoice_template TEXT
);

-- 4. BẢNG KHU VỰC
CREATE TABLE areas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
);

-- 5. BẢNG BÀN
CREATE TABLE tables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL,
  area_id INT,
  status ENUM('trong', 'dang_dung', 'da_dat') DEFAULT 'trong',
  reserved_at DATETIME NULL,
  FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- 6. BẢNG ĐẶT BÀN TRƯỚC
CREATE TABLE reservations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_id INT,
  customer_name VARCHAR(100),
  phone VARCHAR(20),
  arrive_time DATETIME,
  num_guests INT,
  status ENUM('cho', 'da_den', 'huy') DEFAULT 'cho',
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- 7. BẢNG DANH MỤC MÓN ĂN
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

-- 8. BẢNG MÓN ĂN
CREATE TABLE menu_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  category_id INT,
  image_url VARCHAR(255),
  is_visible BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 9. BẢNG NGUYÊN LIỆU
CREATE TABLE ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(20),
  quantity DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 0
);

-- 10. BẢNG CÔNG THỨC MÓN ĂN
CREATE TABLE recipes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  menu_item_id INT,
  ingredient_id INT,
  amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- 11. BẢNG KHÁCH HÀNG
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100),
  points INT DEFAULT 0,
  membership ENUM('thuong', 'bac', 'vang') DEFAULT 'thuong',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. BẢNG KHUYẾN MÃI
CREATE TABLE promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE,
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT TRUE
);

-- 13. BẢNG HÓA ĐƠN
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_id INT,
  account_id INT,
  customer_id INT,
  promotion_id INT,
  status ENUM('dang_goi', 'cho_thanh_toan', 'da_thanh_toan', 'huy') DEFAULT 'dang_goi',
  total_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method ENUM('tien_mat', 'chuyen_khoan', 'qr'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);

-- 14. BẢNG CHI TIẾT ORDER (MÓN GỌI)
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT,
  menu_item_id INT,
  quantity DECIMAL(10,2) NOT NULL,
  price BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  status ENUM('cho', 'dang_nau', 'hoan_thanh', 'huy') DEFAULT 'cho',
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- 15. BẢNG NHẬP/XUẤT KHO
CREATE TABLE inventory_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ingredient_id INT,
  ingredient_name VARCHAR(100),
  type ENUM('nhap', 'xuat') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  note TEXT,
  account_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
INSERT INTO roles (name) VALUES ('admin'), ('ban_hang'), ('bep');
INSERT INTO categories (name) VALUES ('Món chính'), ('Món phụ'), ('Đồ uống'), ('Tráng miệng');
-- Thêm vô cho khách hàng
CREATE TABLE IF NOT EXISTS points_transactions (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  customer_id  INT NOT NULL,
  order_id     INT,
  type         ENUM('cong', 'tru') NOT NULL,
  points       INT NOT NULL,
  note         VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (order_id)    REFERENCES orders(id)
);
CREATE INDEX idx_pt_customer ON points_transactions(customer_id);

