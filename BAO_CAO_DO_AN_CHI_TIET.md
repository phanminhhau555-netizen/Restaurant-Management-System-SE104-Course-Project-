# NhaHangWow - Tài liệu ôn báo cáo đồ án cuối kì

Tài liệu này tổng hợp tech stack, kiến trúc, database, API, logic nghiệp vụ và các chức năng chính của repo `nhahangwow`. Mục tiêu là giúp đọc hiểu code và chuẩn bị trả lời khi báo cáo trực tiếp.

## 1. Tổng quan đề tài

**Tên repo:** `NhaHangWow`

**Loại hệ thống:** Web app fullstack quản lý nhà hàng.

**Mục tiêu chính:**

- Quản lý tài khoản theo vai trò.
- Quản lý bàn, khu vực và đặt bàn.
- Gọi món tại bàn.
- Gửi order xuống bếp theo thời gian thực.
- Bếp cập nhật trạng thái món.
- Thanh toán, in/hiển thị hóa đơn, cấu hình VAT/phương thức thanh toán.
- Quản lý thực đơn, danh mục, công thức món.
- Quản lý kho nguyên liệu, nhập/xuất kho, cảnh báo sắp hết.
- Tự kiểm tra số lượng món có thể bán theo tồn kho.
- Quản lý khách hàng, điểm tích lũy, hạng thành viên.
- Báo cáo doanh thu, món bán chạy, tồn kho.

**Các vai trò trong hệ thống:**

| Vai trò | role_id | Màn hình chính | Quyền chính |
|---|---:|---|---|
| Admin | 1 | `/admin/dashboard` | Quản trị toàn hệ thống, nhân sự, thực đơn, kho, bàn, báo cáo, cài đặt, khách hàng |
| Nhân viên phục vụ | 2 | `/staff/tables` | Mở bàn, đặt bàn, gọi món, thanh toán, xem bán hàng, quản lý thông tin khách |
| Bếp | 3 | `/kitchen/orders` | Xem hàng đợi món, đổi trạng thái món, xem thực đơn/kho với quyền giới hạn |

## 2. Cấu trúc thư mục repo

```text
nhahangwow/
  README.md
  schema.sql
  seed_sample_menu_inventory.sql
  scripts/
    dev.ps1
  restaurant-backend/
    package.json
    src/
      app.js
      config/db.js
      middleware/authMiddleware.js
      routes/
      controllers/
      services/
      scripts/
      migrations/
  restaurant-frontend/
    package.json
    vite.config.js
    tailwind.config.js
    src/
      App.jsx
      main.jsx
      services/
      hooks/
      utils/
      components/
      pages/
```

**Ý nghĩa nhanh:**

- `schema.sql`: tạo database MySQL và các bảng chính.
- `seed_sample_menu_inventory.sql`: dữ liệu mẫu cho menu/kho.
- `scripts/dev.ps1`: chạy backend và frontend cùng lúc.
- `restaurant-backend`: server Express, API, JWT, MySQL, Socket.IO.
- `restaurant-frontend`: giao diện React/Vite/Tailwind.

## 3. Tech stack

### 3.1 Frontend

| Công nghệ | Vai trò |
|---|---|
| React 19 | Xây dựng UI theo component |
| Vite 8 | Dev server và build frontend |
| React Router DOM 7 | Điều hướng trang theo route |
| Axios | Gọi API backend |
| TailwindCSS 3 | Styling nhanh bằng utility class |
| Socket.IO Client | Nhận cập nhật realtime từ backend |
| Phosphor Icons | Icon trong sidebar, button, dashboard |
| Motion | Thư viện animation, có trong dependency |

Các file frontend quan trọng:

- `restaurant-frontend/src/App.jsx`: khai báo toàn bộ route, bảo vệ route theo role.
- `restaurant-frontend/src/services/api.jsx`: cấu hình Axios, base URL, tự gắn token.
- `restaurant-frontend/src/services/socketService.js`: kết nối Socket.IO, join room theo role.
- `restaurant-frontend/src/hooks/useAuth.js`: đọc token/user từ `localStorage`.
- `restaurant-frontend/src/utils/permissions.js`: định nghĩa role, route mặc định, quyền tính năng.
- `restaurant-frontend/src/components/Sidebar.jsx`: menu trái thay đổi theo vai trò.
- `restaurant-frontend/src/components/Menu.jsx`: quản lý/xem thực đơn, danh mục, công thức.
- `restaurant-frontend/src/components/Warehouse.jsx`: quản lý/xem kho, nhập/xuất, log.

### 3.2 Backend

| Công nghệ | Vai trò |
|---|---|
| Node.js | Runtime backend |
| Express 5 | REST API |
| MySQL 8 | Database quan hệ |
| mysql2 | Kết nối MySQL, dùng pool promise |
| JWT/jsonwebtoken | Xác thực token |
| bcryptjs | Mã hóa mật khẩu |
| dotenv | Đọc biến môi trường `.env` |
| cors | Cho frontend gọi backend |
| Socket.IO | Realtime giữa staff/admin/kitchen |

Các file backend quan trọng:

- `restaurant-backend/src/app.js`: tạo Express app, HTTP server, Socket.IO, mount routes.
- `restaurant-backend/src/config/db.js`: tạo MySQL connection pool.
- `restaurant-backend/src/middleware/authMiddleware.js`: xác thực token và kiểm tra admin.
- `restaurant-backend/src/routes/*.js`: định nghĩa API endpoint.
- `restaurant-backend/src/controllers/*.js`: xử lý nghiệp vụ từng module.
- `restaurant-backend/src/services/orderInventoryService.js`: tính tồn kho khả dụng, chống bán quá số lượng.
- `restaurant-backend/src/services/menuAvailabilityService.js`: tự ẩn/hiện món theo tồn kho.

### 3.3 Database

Database dùng MySQL, tên DB trong `.env` là `nhahangwow`.

Các bảng chính:

| Bảng | Ý nghĩa |
|---|---|
| `roles` | Danh sách vai trò: admin, bán hàng, bếp |
| `accounts` | Tài khoản nhân viên/admin/bếp |
| `config` | Cấu hình quán: tên quán, VAT, phương thức thanh toán, mẫu hóa đơn |
| `areas` | Khu vực bàn |
| `tables` | Bàn trong nhà hàng, trạng thái bàn |
| `reservations` | Đặt bàn trước |
| `categories` | Danh mục món |
| `menu_items` | Món ăn/thức uống |
| `ingredients` | Nguyên liệu tồn kho |
| `recipes` | Công thức món: mỗi món cần nguyên liệu nào, số lượng bao nhiêu |
| `customers` | Khách hàng, điểm, hạng thành viên |
| `promotions` | Mã khuyến mãi |
| `orders` | Hóa đơn/order |
| `order_items` | Chi tiết món trong order |
| `inventory_logs` | Lịch sử nhập/xuất kho |
| `points_transactions` | Lịch sử cộng/trừ điểm khách hàng |

## 4. Cài đặt và chạy dự án

### 4.1 Import database

```bash
mysql -u root -p < schema.sql
```

Nếu muốn có dữ liệu mẫu menu/kho:

```bash
mysql -u root -p nhahangwow < seed_sample_menu_inventory.sql
```

### 4.2 Cấu hình `.env` backend

Tạo file `.env` trong `restaurant-backend`:

```env
PORT=5000
DB_HOST=localhost
DB_NAME=nhahangwow
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
CLIENT_URL=http://localhost:5173
```

### 4.3 Tạo admin ban đầu

```bash
cd restaurant-backend
npm install
node src/scripts/seedAdmin.js
```

### 4.4 Chạy backend

```bash
cd restaurant-backend
npm run dev
```

Backend mặc định chạy ở:

```text
http://localhost:5000
```

### 4.5 Chạy frontend

```bash
cd restaurant-frontend
npm install
npm run dev
```

Frontend mặc định chạy ở:

```text
http://localhost:5173
```

### 4.6 Chạy cả hai bằng script

```powershell
.\scripts\dev.ps1
```

Script này mở backend và frontend, đồng thời in ra:

```text
Backend:  http://localhost:5000
Frontend: http://localhost:5173
```

## 5. Kiến trúc tổng thể

```text
Người dùng
  |
  v
React Frontend
  |  Axios REST API + JWT
  v
Express Backend
  |  mysql2 pool
  v
MySQL Database

Realtime:
React Frontend <---- Socket.IO ----> Express/Socket.IO Server
```

Luồng dữ liệu phổ biến:

1. Người dùng đăng nhập.
2. Backend kiểm tra username/password trong MySQL.
3. Backend trả JWT token và thông tin user.
4. Frontend lưu `token` và `user` vào `localStorage`.
5. Axios interceptor tự gắn token vào header `authorization`.
6. Backend middleware `verifyToken` xác thực token trước khi cho gọi API cần đăng nhập.
7. Một số thao tác phát sự kiện Socket.IO để các màn hình khác cập nhật ngay.

## 6. Xác thực và phân quyền

### 6.1 Đăng nhập

File xử lý:

- Backend: `restaurant-backend/src/controllers/authController.js`
- Frontend: `restaurant-frontend/src/pages/Login.jsx`

Luồng:

1. Frontend gửi `username`, `password` đến `POST /api/auth/login`.
2. Backend query bảng `accounts` với `username` và `is_active = 1`.
3. Backend dùng `bcrypt.compare()` để so mật khẩu.
4. Nếu đúng, backend tạo JWT chứa:

```js
{ id: account.id, role_id: account.role_id }
```

5. Token có hạn 8 giờ.
6. Frontend lưu:

```text
localStorage.token
localStorage.user
```

7. Sau đăng nhập, route mặc định phụ thuộc role:

| role_id | Trang mặc định |
|---:|---|
| 1 | `/admin/dashboard` |
| 2 | `/staff/tables` |
| 3 | `/kitchen/orders` |

### 6.2 Middleware backend

File: `restaurant-backend/src/middleware/authMiddleware.js`

`verifyToken` làm 3 việc:

1. Lấy token từ header `authorization`.
2. Verify token bằng `JWT_SECRET`.
3. Query lại database để chắc chắn account vẫn tồn tại và `is_active = 1`.

Nếu token sai hoặc account bị xóa/vô hiệu thì trả lỗi.

`isAdmin` kiểm tra:

```js
req.user.role_id === 1
```

Các API quản trị như thêm/sửa/xóa menu, thêm bàn, báo cáo, cài đặt đều cần admin.

### 6.3 Bảo vệ route frontend

File: `restaurant-frontend/src/App.jsx`

Component `PrivateRoute`:

- Nếu chưa đăng nhập thì chuyển về `/login`.
- Nếu sai role thì chuyển về trang mặc định của user.

Ví dụ:

- Staff không vào được `/admin/dashboard`.
- Kitchen không vào được `/staff/tables`.
- Admin không bị điều hướng nhầm sang màn staff.

## 7. Realtime bằng Socket.IO

### 7.1 Backend socket

File: `restaurant-backend/src/app.js`

Khi client kết nối, backend lắng nghe event:

```js
join_room
```

Chỉ cho join 3 room:

```text
admin
staff
kitchen
```

Trước khi join room mới, socket rời các room role cũ để tránh nhận nhầm event.

### 7.2 Frontend socket

File: `restaurant-frontend/src/services/socketService.js`

Các hàm chính:

- `joinRealtimeRoom(room)`: kết nối socket và join room.
- `subscribeRealtime(eventName, handler)`: đăng ký nghe event và trả về hàm unsubscribe.

### 7.3 Các event realtime quan trọng

| Event | Ai phát | Ai nghe | Ý nghĩa |
|---|---|---|---|
| `NEW_KITCHEN_ORDER` | Backend khi staff gửi order | Kitchen | Có món mới cần bếp xử lý |
| `ITEM_STATUS_UPDATED` | Backend khi bếp đổi trạng thái món | Kitchen/Staff/Admin | Trạng thái món thay đổi |
| `TABLE_STATUS_UPDATED` | Backend khi đổi trạng thái bàn/thanh toán/hủy | Admin/Staff | Bàn trống/có khách/đã đặt thay đổi |
| `TABLE_LIST_UPDATED` | Backend khi thêm/xóa bàn/khu vực | Admin/Staff | Danh sách bàn/khu vực thay đổi |
| `PAYMENT_COMPLETED` | Backend khi checkout | Admin/Staff | Thanh toán xong, bàn được giải phóng |

## 8. Các module backend và API

### 8.1 Auth API

Route file: `restaurant-backend/src/routes/authRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| POST | `/api/auth/register` | Public hiện tại, nhưng không cho tạo admin | Tạo tài khoản staff/bếp |
| POST | `/api/auth/login` | Public | Đăng nhập |
| GET | `/api/auth/accounts` | Admin | Lấy danh sách tài khoản |
| DELETE | `/api/auth/accounts/:id` | Admin | Xóa tài khoản |
| GET | `/api/auth/roles` | Public | Lấy danh sách vai trò |

Lưu ý khi xóa account:

- Backend set `orders.account_id = NULL`.
- Backend set `inventory_logs.account_id = NULL`.
- Sau đó mới xóa account để tránh lỗi khóa ngoại.

### 8.2 Menu API

Route file: `restaurant-backend/src/routes/menuRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/menu/categories` | Public | Lấy danh mục |
| GET | `/api/menu` | Public | Lấy danh sách món |
| GET | `/api/menu/:id` | Public | Lấy chi tiết món |
| POST | `/api/menu/categories` | Admin | Thêm danh mục |
| PUT | `/api/menu/categories/:id` | Admin | Sửa danh mục |
| DELETE | `/api/menu/categories/:id` | Admin | Xóa danh mục |
| POST | `/api/menu` | Admin | Thêm món |
| PUT | `/api/menu/:id` | Admin | Sửa món |
| DELETE | `/api/menu/:id` | Admin | Xóa món |
| PATCH | `/api/menu/:id/toggle` | Admin | Ẩn/hiện món |

Logic đáng nhớ:

- Khi lấy menu, backend gọi `hideMenuItemsWithOutOfStockIngredients(db)` trước.
- Backend trả thêm:
  - `max_order_quantity`: số phần tối đa có thể order theo tồn kho.
  - `ingredient_availability`: chi tiết từng nguyên liệu còn bao nhiêu, đang bị giữ bao nhiêu.

### 8.3 Table API

Route file: `restaurant-backend/src/routes/tableRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/tables/areas` | Đã đăng nhập | Lấy khu vực |
| POST | `/api/tables/areas` | Admin | Thêm khu vực |
| DELETE | `/api/tables/areas/:id` | Admin | Xóa khu vực |
| GET | `/api/tables/reservations/all` | Đã đăng nhập | Lấy danh sách đặt bàn |
| POST | `/api/tables/reservations` | Đã đăng nhập | Tạo đặt bàn |
| GET | `/api/tables` | Đã đăng nhập | Lấy danh sách bàn |
| POST | `/api/tables` | Admin | Thêm bàn |
| GET | `/api/tables/:id` | Đã đăng nhập | Lấy chi tiết bàn |
| PUT | `/api/tables/:id` | Admin | Sửa bàn |
| DELETE | `/api/tables/:id` | Admin | Xóa bàn |
| PATCH | `/api/tables/:id/status` | Đã đăng nhập | Cập nhật trạng thái bàn |

Trạng thái bàn:

| Status | Ý nghĩa |
|---|---|
| `trong` | Bàn trống |
| `dang_dung` | Đang có khách |
| `da_dat` | Đã đặt trước |

Logic xóa bàn:

- Không cho xóa nếu bàn có order chưa hoàn tất.
- Không cho xóa nếu bàn có reservation trạng thái `cho`.
- Nếu được xóa, backend set `orders.table_id = NULL`, `reservations.table_id = NULL`, rồi xóa bàn.

Logic đóng bàn/chuyển về `trong`:

- Nếu order có món `hoan_thanh`, order chuyển sang `cho_thanh_toan`.
- Nếu chưa có món nào hoàn thành, order chuyển sang `huy`.
- Sau đó phát `TABLE_STATUS_UPDATED`.

### 8.4 Order API

Route file: `restaurant-backend/src/routes/orderRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/orders` | Đã đăng nhập | Lấy tất cả order/lịch sử bán |
| GET | `/api/orders/active` | Đã đăng nhập | Lấy order đang hoạt động |
| GET | `/api/orders/kitchen` | Đã đăng nhập | Lấy hàng đợi bếp |
| GET | `/api/orders/:id` | Đã đăng nhập | Chi tiết order |
| POST | `/api/orders` | Đã đăng nhập | Tạo order mới |
| POST | `/api/orders/:id/items` | Đã đăng nhập | Thêm món vào order |
| POST | `/api/orders/:id/send` | Đã đăng nhập | Gửi order xuống bếp |
| PATCH | `/api/orders/:id/items/:itemId/status` | Đã đăng nhập | Bếp cập nhật trạng thái món |
| DELETE | `/api/orders/:id/items/:itemId` | Đã đăng nhập | Hủy/xóa món |
| DELETE | `/api/orders/:id` | Đã đăng nhập | Xóa order/hóa đơn |

Trạng thái order:

| Status | Ý nghĩa |
|---|---|
| `dang_goi` | Đang gọi món |
| `cho_thanh_toan` | Đã có món phục vụ, chờ thanh toán |
| `da_thanh_toan` | Đã thanh toán |
| `huy` | Đã hủy |

Trạng thái món trong order:

| Status | Ý nghĩa |
|---|---|
| `cho` | Chờ bếp |
| `dang_nau` | Bếp đang nấu |
| `hoan_thanh` | Món đã xong |
| `huy` | Món bị hủy |

Logic tạo order:

1. Staff chọn bàn.
2. Backend kiểm tra bàn có tồn tại không.
3. Bàn phải có status `dang_dung`.
4. Backend tạo row trong `orders` với `table_id`, `account_id`, `customer_id`.

Logic thêm món:

1. Backend kiểm tra số lượng > 0.
2. Lấy giá món từ `menu_items`.
3. Lock nguyên liệu liên quan bằng `FOR UPDATE`.
4. Tính số phần tối đa còn bán được bằng `getMenuItemAvailability`.
5. Nếu hết nguyên liệu, trả lỗi 409.
6. Nếu kho không đủ số lượng yêu cầu, backend tự giảm xuống số lượng tối đa có thể thêm.
7. Insert vào `order_items`.
8. Cập nhật `orders.total_amount = SUM(price * quantity)`.

Điểm hay để trình bày:

- Hệ thống không chỉ trừ kho sau khi thanh toán, mà còn tính cả nguyên liệu đang bị giữ bởi các order đang mở.
- Nhờ vậy tránh trường hợp 2 bàn cùng order vượt quá lượng nguyên liệu tồn.

Logic gửi bếp:

1. Backend kiểm tra order có ít nhất một item status `cho`.
2. Nếu có, phát event `NEW_KITCHEN_ORDER` đến room `kitchen`.
3. Màn bếp refresh danh sách món.

Logic bếp cập nhật món:

1. Kitchen gọi `PATCH /api/orders/:id/items/:itemId/status`.
2. Backend update `order_items.status`.
3. Backend phát `ITEM_STATUS_UPDATED` đến kitchen, staff, admin.

### 8.5 Payment API

Route file: `restaurant-backend/src/routes/paymentRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/payment/:id/invoice` | Đã đăng nhập | Lấy hóa đơn |
| POST | `/api/payment/:id/promotion` | Đã đăng nhập | Áp dụng mã khuyến mãi |
| POST | `/api/payment/:id/checkout` | Đã đăng nhập | Thanh toán |
| PATCH | `/api/payment/:id/cancel` | Đã đăng nhập | Hủy order |

Logic tính hóa đơn:

```text
total_amount = tổng tiền món
tax_amount = total_amount * tax_rate / 100
final_amount = total_amount + tax_amount - discount_amount
```

Logic checkout:

1. Lấy order.
2. Chặn nếu order đã `da_thanh_toan`.
3. Kiểm tra lại tồn kho toàn bộ món bằng `checkOrderItemsAvailability`.
4. Nếu thiếu nguyên liệu, trả lỗi 409.
5. Nếu frontend gửi danh sách `items`, backend ghi đè lại `order_items` theo danh sách thực tế.
6. Tính lại tổng tiền từ `order_items`.
7. Lấy VAT từ bảng `config`.
8. Update order:
   - `status = da_thanh_toan`
   - `payment_method`
   - `tax_amount`
   - `total_amount = final_amount`
   - `customer_id`
   - `paid_at = NOW()`
9. Cập nhật bàn về `trong`.
10. Cộng điểm khách hàng nếu có.
11. Tự động trừ kho theo công thức món.
12. Tự ẩn món nếu nguyên liệu không còn đủ.
13. Phát realtime:
   - `PAYMENT_COMPLETED`
   - `TABLE_STATUS_UPDATED`

Các phương thức thanh toán:

| Giá trị | Ý nghĩa |
|---|---|
| `tien_mat` | Tiền mặt |
| `chuyen_khoan` | Chuyển khoản |
| `qr` | QR |

### 8.6 Inventory API

Route file: `restaurant-backend/src/routes/inventoryRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/inventory` | Đã đăng nhập | Lấy nguyên liệu |
| GET | `/api/inventory/low-stock` | Đã đăng nhập | Nguyên liệu sắp hết |
| POST | `/api/inventory` | Admin | Thêm nguyên liệu |
| PUT | `/api/inventory/:id` | Admin | Sửa nguyên liệu |
| DELETE | `/api/inventory/:id` | Admin | Xóa nguyên liệu |
| POST | `/api/inventory/import` | Đã đăng nhập | Nhập kho |
| POST | `/api/inventory/export` | Đã đăng nhập | Xuất kho thủ công |
| GET | `/api/inventory/logs` | Đã đăng nhập | Lịch sử kho |
| GET | `/api/inventory/recipes` | Đã đăng nhập | Lấy công thức món |
| POST | `/api/inventory/recipes` | Admin | Thêm dòng công thức |
| PUT | `/api/inventory/recipes/:menuItemId` | Admin | Cập nhật công thức của một món |

Logic nhập kho:

- Cộng `ingredients.quantity`.
- Ghi log `inventory_logs` type `nhap`.
- Gọi `showMenuItemsWithAvailableIngredients` để hiện lại món nếu nguyên liệu đã đủ.

Logic xuất kho:

- Kiểm tra nguyên liệu tồn tại.
- Kiểm tra đủ số lượng.
- Trừ `ingredients.quantity`.
- Ghi log `inventory_logs` type `xuat`.
- Gọi `hideMenuItemsWithOutOfStockIngredients` để ẩn món thiếu nguyên liệu.

Logic xóa nguyên liệu:

- Dùng transaction.
- Lưu lại `ingredient_name` và `unit` vào `inventory_logs` trước khi set `ingredient_id = NULL`.
- Xóa các dòng `recipes` liên quan.
- Xóa nguyên liệu.

### 8.7 Customer API

Route file: `restaurant-backend/src/routes/customerRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| POST | `/api/customers/lookup` | Đã đăng nhập | Tìm hoặc tạo khách theo số điện thoại |
| GET | `/api/customers` | Đã đăng nhập | Lấy danh sách khách |
| GET | `/api/customers/search` | Đã đăng nhập | Tìm khách theo số điện thoại |
| POST | `/api/customers` | Đã đăng nhập | Tạo khách |
| GET | `/api/customers/:id/points-history` | Đã đăng nhập | Lịch sử điểm |
| GET | `/api/customers/:id` | Đã đăng nhập | Chi tiết khách + lịch sử giao dịch |
| PUT | `/api/customers/:id` | Đã đăng nhập | Sửa khách |
| DELETE | `/api/customers/:id` | Admin | Xóa khách |
| POST | `/api/customers/:id/add-points` | Đã đăng nhập | Cộng điểm thủ công |
| POST | `/api/customers/:id/redeem-points` | Đã đăng nhập | Đổi điểm |

Hạng thành viên:

| Hạng | Điều kiện theo code mới |
|---|---|
| `thuong` | Dưới 1000 điểm |
| `bac` | Từ 1000 điểm |
| `vang` | Từ 5000 điểm |

Công thức cộng điểm khi thanh toán:

```text
points = floor(final_amount / 1000)
```

Ví dụ: hóa đơn 253.000đ thì cộng 253 điểm.

Đổi điểm:

```text
100 điểm = 10.000đ giảm giá
```

### 8.8 Report API

Route file: `restaurant-backend/src/routes/reportRoutes.js`

Tất cả endpoint trong module báo cáo cần admin.

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/reports/revenue/day` | Doanh thu theo ngày |
| GET | `/api/reports/revenue/week` | Doanh thu 7 ngày gần nhất |
| GET | `/api/reports/revenue/month` | Doanh thu theo tháng |
| GET | `/api/reports/top-items` | Top món bán chạy |
| GET | `/api/reports/inventory` | Báo cáo tồn kho |

Báo cáo doanh thu chỉ tính:

```sql
orders.status = "da_thanh_toan"
```

Top món bán chạy chỉ tính item:

```sql
order_items.status = "hoan_thanh"
```

### 8.9 Settings API

Route file: `restaurant-backend/src/routes/settingsRoutes.js`

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/settings` | Đã đăng nhập | Lấy cấu hình quán |
| PUT | `/api/settings` | Admin | Cập nhật cấu hình |

Cấu hình gồm:

- `ten_quan`
- `tax_rate`
- `payment_methods`
- `invoice_template`
  - footer
  - contact
  - bank_id
  - account_no
  - account_name

Nếu bảng `config` chưa có row, backend tự tạo row mặc định.

## 9. Các màn hình frontend

### 9.1 Login

File: `restaurant-frontend/src/pages/Login.jsx`

Chức năng:

- Nhập username/password.
- Gọi `/api/auth/login`.
- Lưu token/user.
- Điều hướng theo role.

### 9.2 Layout và Sidebar

Files:

- `restaurant-frontend/src/components/Layout.jsx`
- `restaurant-frontend/src/components/Sidebar.jsx`

Chức năng:

- Sidebar thu gọn/mở rộng.
- Menu thay đổi theo role.
- Có dropdown tài khoản và đăng xuất.
- Nếu route có `mode=qr` hoặc `qr=true`, Layout ẩn sidebar để phù hợp chế độ order QR.

Menu Admin:

- Tổng quan
- Thực đơn
- Kho hàng
- Báo cáo
- Cài đặt
- Nhân sự
- Bàn
- Khách hàng

Menu Staff:

- Order món
- Quản lý bán hàng
- Khách hàng

Menu Kitchen:

- Order bếp
- Thực đơn
- Kho hàng

### 9.3 Admin Dashboard

File: `restaurant-frontend/src/pages/admin/Dashboard.jsx`

API dùng:

- `/api/reports/revenue/day`
- `/api/orders/active`

Chức năng:

- Hiển thị doanh thu ngày.
- Hiển thị số đơn.
- Hiển thị order đang hoạt động.
- Format tiền theo `vi-VN`.

### 9.4 Admin Staff

File: `restaurant-frontend/src/pages/admin/Staff.jsx`

API dùng:

- `GET /api/auth/accounts`
- `POST /api/auth/register`
- `DELETE /api/auth/accounts/:id`

Chức năng:

- Xem danh sách tài khoản.
- Tạo tài khoản staff/bếp.
- Xóa tài khoản.
- Thống kê số lượng theo role.

Lưu ý:

- Backend không cho tạo tài khoản admin qua API register.
- Admin ban đầu tạo bằng script `seedAdmin.js`.

### 9.5 Admin/Menu và Kitchen/Menu

Files:

- `restaurant-frontend/src/pages/admin/Menu.jsx`
- `restaurant-frontend/src/pages/kitchen/Menu.jsx`
- Logic chung: `restaurant-frontend/src/components/Menu.jsx`

Admin có quyền:

- Thêm món.
- Xóa món.
- Ẩn/hiện món.
- Quản lý danh mục.
- Thêm/sửa công thức món.

Kitchen chỉ xem, không được chỉnh:

- Không tạo món.
- Không xóa món.
- Không sửa công thức.
- Không quản lý danh mục.

### 9.6 Admin/Warehouse và Kitchen/Warehouse

Files:

- `restaurant-frontend/src/pages/admin/Warehouse.jsx`
- `restaurant-frontend/src/pages/kitchen/Warehouse.jsx`
- Logic chung: `restaurant-frontend/src/components/Warehouse.jsx`

Admin có quyền:

- Xem kho.
- Xem log.
- Nhập/xuất kho.
- Tạo nguyên liệu.
- Xóa nguyên liệu.

Kitchen có quyền giới hạn:

- Xem kho.
- Xem log.
- Nhập/xuất kho.
- Không tạo/xóa nguyên liệu.

### 9.7 Admin Tables

File: `restaurant-frontend/src/pages/admin/Tables.jsx`

API dùng:

- `/api/tables`
- `/api/tables/areas`

Chức năng:

- Xem bàn theo khu vực.
- Thêm bàn.
- Thêm khu vực.
- Xóa bàn.
- Xóa khu vực.
- Cập nhật trạng thái bàn.
- Nghe realtime `TABLE_STATUS_UPDATED`, `TABLE_LIST_UPDATED`, `PAYMENT_COMPLETED`.

### 9.8 Staff Tables

File: `restaurant-frontend/src/pages/staff/Tables.jsx`

Chức năng:

- Xem sơ đồ bàn.
- Lọc theo khu vực.
- Hiển thị số bàn trống/đang dùng/đã đặt.
- Chọn bàn để order.
- Chuyển bàn sang đang dùng.
- Đặt bàn/chuyển trạng thái đặt.
- Đóng bàn.
- Tạo link/QR mode order theo bàn.
- Có panel danh sách đặt bàn.

Logic chọn bàn:

- Nếu bàn `trong`, staff có thể chuyển sang `dang_dung`.
- Nếu bàn `dang_dung`, vào màn order.
- Nếu bàn `da_dat`, staff có thể xử lý đặt bàn hoặc chuyển sang đang dùng khi khách đến.

### 9.9 Staff Reservations

File: `restaurant-frontend/src/pages/staff/Reservations.jsx`

API dùng:

- `/api/tables`
- `/api/tables/areas`
- `/api/tables/reservations/all`
- `/api/tables/reservations`

Chức năng:

- Xem danh sách bàn và đặt bàn.
- Tạo reservation.
- Cập nhật trạng thái bàn khi khách đến.
- Nghe realtime cập nhật bàn.

### 9.10 Staff TableOrder

File: `restaurant-frontend/src/pages/staff/TableOrder.jsx`

Đây là một trong các file nghiệp vụ lớn nhất.

API dùng:

- `GET /api/tables/:tableId`
- `GET /api/menu`
- `GET /api/menu/categories`
- `GET /api/orders/active`
- `GET /api/orders/:id`
- `POST /api/orders`
- `POST /api/orders/:id/items`
- `POST /api/orders/:id/send`
- `DELETE /api/orders/:id/items/:itemId`

Chức năng:

- Lấy thông tin bàn.
- Lấy menu và danh mục.
- Tìm order đang mở của bàn.
- Hiển thị menu theo danh mục, tìm kiếm, phân trang.
- Giỏ hàng theo bàn.
- Lưu giỏ hàng tạm trong `localStorage` theo key `cart_table_${tableId}`.
- Hiển thị trạng thái món đã gửi bếp/chưa gửi.
- Cho phép sửa số lượng, giá, ghi chú.
- Kiểm tra giới hạn tồn kho ngay trên frontend dựa vào `max_order_quantity` và `ingredient_availability`.
- Tạo order nếu bàn chưa có order.
- Thêm món vào order.
- Gửi món xuống bếp.

Điểm cần hiểu:

- Frontend gom các món cùng `menu_item_id` lại để hiển thị trong cart.
- `serverParts` dùng để biết phần nào đã được lưu ở backend.
- Khi giảm/xóa món đã gửi server, frontend gọi API delete item tương ứng.
- Khi thêm món mới, frontend gọi `POST /api/orders/:id/items`.
- Sau khi có món cần gửi bếp, frontend gọi `POST /api/orders/:id/send`.

### 9.11 Kitchen Orders

File: `restaurant-frontend/src/pages/kitchen/Orders.jsx`

API dùng:

- `GET /api/orders/kitchen`
- `PATCH /api/orders/:id/items/:itemId/status`

Chức năng:

- Hiển thị từng món đang chờ bếp hoặc đang nấu.
- Sắp xếp FIFO theo thời gian order.
- Cập nhật thời gian chờ mỗi giây.
- Auto refresh mỗi 15 giây.
- Nghe realtime:
  - `NEW_KITCHEN_ORDER`
  - `ITEM_STATUS_UPDATED`
- Bếp đổi trạng thái:
  - `cho` -> `dang_nau`
  - `dang_nau` -> `hoan_thanh`

### 9.12 Staff TablePayment

File: `restaurant-frontend/src/pages/staff/TablePayment.jsx`

API dùng:

- `/api/tables/:tableId`
- `/api/orders`
- `/api/settings`
- `/api/orders/:id`
- `/api/payment/:orderId/checkout`

Chức năng:

- Tìm order chưa thanh toán của bàn.
- Hiển thị món trong order.
- Tính tổng tiền.
- Đọc cấu hình phương thức thanh toán từ settings.
- Hỗ trợ tiền mặt/chuyển khoản/QR.
- Khi xác nhận, gọi checkout.
- Checkout xong chuyển về danh sách bàn.

### 9.13 Staff Sales Page

File: `restaurant-frontend/src/pages/staff/StaffSalesPage.jsx`

API dùng:

- `/api/orders`
- `/api/orders/:id`
- `/api/payment/:id/checkout`
- `/api/orders/:id` delete
- `/api/settings`

Chức năng:

- Quản lý lịch sử bán hàng.
- Lọc theo ngày, tháng, năm, giờ, trạng thái.
- Tìm theo mã đơn, tên bàn, người tạo.
- Xem chi tiết order.
- Checkout lại order nếu cần.
- Xóa order.
- Thống kê doanh thu/số đơn trên tập dữ liệu đã lọc.

### 9.14 Customers

Files:

- Admin: `restaurant-frontend/src/pages/admin/Customers.jsx`
- Staff: `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx`

Admin:

- Xem danh sách khách.
- Tìm kiếm.
- Xem điểm/hạng.
- Xem lịch sử điểm.
- Xóa khách.

Staff:

- Lookup hoặc tạo khách bằng số điện thoại.
- Cập nhật tên/email.
- Xem lịch sử điểm.

## 10. Logic nghiệp vụ quan trọng cần thuộc

### 10.1 Luồng đăng nhập

```text
Login form
  -> POST /api/auth/login
  -> backend kiểm tra account + bcrypt
  -> tạo JWT 8h
  -> frontend lưu token/user
  -> redirect theo role
```

Câu trả lời gợi ý:

> Hệ thống dùng JWT để xác thực. Sau khi đăng nhập thành công, backend trả token chứa id và role_id. Frontend lưu token trong localStorage, Axios tự gắn token vào header authorization cho các request sau. Backend verify token và kiểm tra account còn active trước khi xử lý API.

### 10.2 Luồng mở bàn và order món

```text
Staff chọn bàn
  -> nếu bàn trống: PATCH /api/tables/:id/status = dang_dung
  -> vào /staff/orders/:tableId
  -> frontend lấy menu + order active
  -> thêm món vào cart
  -> POST /api/orders nếu chưa có order
  -> POST /api/orders/:id/items
  -> POST /api/orders/:id/send
  -> backend emit NEW_KITCHEN_ORDER
```

Câu trả lời gợi ý:

> Một bàn phải chuyển sang trạng thái đang dùng trước khi tạo order. Khi thêm món, backend kiểm tra giá món, kiểm tra tồn kho theo công thức, thêm vào order_items và cập nhật tổng tiền order. Khi gửi bếp, backend phát realtime event để màn bếp nhận món mới.

### 10.3 Luồng bếp xử lý món

```text
Kitchen join room kitchen
  -> nhận NEW_KITCHEN_ORDER
  -> GET /api/orders/kitchen
  -> hiển thị các item status cho/dang_nau
  -> PATCH status item
  -> backend emit ITEM_STATUS_UPDATED
```

Câu trả lời gợi ý:

> Màn bếp không xử lý theo hóa đơn lớn, mà hiển thị từng món trong hàng đợi. Món được sắp xếp theo thời gian order để đảm bảo FIFO. Khi bếp cập nhật trạng thái, staff/admin/kitchen đều nhận event để đồng bộ.

### 10.4 Luồng thanh toán

```text
Staff vào payment
  -> lấy order chưa thanh toán
  -> lấy settings VAT/payment methods
  -> POST /api/payment/:id/checkout
  -> backend kiểm tra tồn kho lần cuối
  -> tính tổng + thuế - giảm giá
  -> cập nhật order da_thanh_toan
  -> bàn về trong
  -> cộng điểm khách
  -> trừ kho
  -> emit PAYMENT_COMPLETED + TABLE_STATUS_UPDATED
```

Câu trả lời gợi ý:

> Checkout là bước chốt dữ liệu. Backend tính lại tổng tiền từ order_items để tránh phụ thuộc hoàn toàn vào frontend. Sau khi thanh toán, order chuyển sang đã thanh toán, bàn được giải phóng, kho bị trừ theo recipes, khách hàng được cộng điểm nếu có customer_id.

### 10.5 Logic tồn kho và chống bán vượt

File: `restaurant-backend/src/services/orderInventoryService.js`

Ý tưởng:

- Mỗi món có công thức trong bảng `recipes`.
- Mỗi công thức cho biết 1 phần món cần bao nhiêu nguyên liệu.
- Tồn kho thực tế nằm ở `ingredients.quantity`.
- Nhưng số lượng còn bán được phải trừ thêm nguyên liệu đang bị giữ bởi các order chưa thanh toán/hủy.

Các order được xem là đang giữ nguyên liệu:

```js
['dang_goi', 'cho_thanh_toan']
```

Món bị hủy không tính:

```sql
oi.status != "huy"
```

Công thức tính:

```text
remaining_quantity = stock_quantity - reserved_quantity
available_item_quantity = floor(remaining_quantity / required_per_item)
max_quantity = min(available_item_quantity của tất cả nguyên liệu trong món)
```

Ví dụ:

- Món phở cần 200g bò và 1 phần bánh phở.
- Kho còn 1000g bò và 3 phần bánh phở.
- Bò đủ 5 tô, bánh phở đủ 3 tô.
- Vậy món phở chỉ bán tối đa 3 tô.

Điểm mạnh:

- Tránh oversell khi nhiều bàn đang order.
- Backend vẫn kiểm tra, dù frontend cũng có cảnh báo.
- Khi nhập kho lại, món có thể được hiện lại.
- Khi kho thiếu, món tự bị ẩn.

### 10.6 Logic ẩn/hiện món theo kho

File: `restaurant-backend/src/services/menuAvailabilityService.js`

Ẩn món:

```text
Nếu ingredient.quantity < recipe.amount
thì menu_items.is_visible = 0
```

Hiện lại món:

```text
Khi nhập kho nguyên liệu,
nếu tất cả nguyên liệu trong công thức của món đã đủ,
thì menu_items.is_visible = 1
```

Câu trả lời gợi ý:

> Hệ thống liên kết menu với kho qua bảng recipes. Nếu một nguyên liệu không đủ cho một phần món, món đó sẽ tự ẩn để staff không bán nhầm. Khi nhập kho lại, hệ thống kiểm tra nếu món đã đủ nguyên liệu thì hiện lại.

### 10.7 Logic khách hàng và điểm

Luồng lookup:

```text
Staff nhập số điện thoại
  -> POST /api/customers/lookup
  -> nếu có khách: trả customer
  -> nếu chưa có: tạo khách mới chỉ với phone
```

Luồng cộng điểm khi thanh toán:

```text
final_amount / 1000, làm tròn xuống
```

Luồng hạng thành viên:

```text
>= 5000 điểm: vàng
>= 1000 điểm: bạc
còn lại: thường
```

Lịch sử điểm nằm trong bảng `points_transactions`.

### 10.8 Logic báo cáo

Doanh thu:

- Lấy từ bảng `orders`.
- Chỉ tính order `da_thanh_toan`.
- Có báo cáo theo ngày, 7 ngày, tháng.

Top món:

- Join `order_items`, `menu_items`, `orders`.
- Chỉ tính order đã thanh toán và item hoàn thành.
- Sắp xếp theo tổng số lượng bán.

Tồn kho:

- Lấy từ `ingredients`.
- Cảnh báo:
  - `quantity <= min_quantity`: sắp hết.
  - `quantity = 0`: hết hàng.
- Có thống kê nhập/xuất trong tháng từ `inventory_logs`.

## 11. Database chi tiết

### 11.1 `roles`

Lưu vai trò.

```text
id
name: admin | ban_hang | bep
```

Seed mặc định:

```sql
INSERT INTO roles (name) VALUES ('admin'), ('ban_hang'), ('bep');
```

### 11.2 `accounts`

Tài khoản hệ thống.

```text
id
username
password
full_name
role_id
is_active
created_at
```

Quan hệ:

- `role_id` -> `roles.id`

### 11.3 `config`

Cấu hình quán.

```text
id
ten_quan
tax_rate
payment_methods
invoice_template
```

`invoice_template` là JSON dạng text, ví dụ:

```json
{
  "footer": "Cảm ơn quý khách và hẹn gặp lại!",
  "contact": "123 Đường Ẩm Thực...",
  "bank_id": "VCB",
  "account_no": "1049144528",
  "account_name": "PHAM TRUONG PHAT"
}
```

### 11.4 `areas` và `tables`

`areas`:

```text
id
name
```

`tables`:

```text
id
name
area_id
status: trong | dang_dung | da_dat
reserved_at
```

Quan hệ:

- `tables.area_id` -> `areas.id`

### 11.5 `reservations`

Đặt bàn trước.

```text
id
table_id
customer_name
phone
arrive_time
num_guests
status: cho | da_den | huy
```

Quan hệ:

- `table_id` -> `tables.id`

### 11.6 `categories` và `menu_items`

`categories`:

```text
id
name
```

`menu_items`:

```text
id
name
description
price
category_id
image_url
is_visible
```

Quan hệ:

- `menu_items.category_id` -> `categories.id`

### 11.7 `ingredients` và `recipes`

`ingredients`:

```text
id
name
unit
quantity
min_quantity
```

`recipes`:

```text
id
menu_item_id
ingredient_id
amount
```

Quan hệ:

- `recipes.menu_item_id` -> `menu_items.id`
- `recipes.ingredient_id` -> `ingredients.id`

Đây là cặp bảng rất quan trọng vì nối thực đơn với kho.

### 11.8 `customers` và `points_transactions`

`customers`:

```text
id
full_name
phone
email
points
membership: thuong | bac | vang
created_at
```

`points_transactions`:

```text
id
customer_id
order_id
type: cong | tru
points
note
created_at
```

Quan hệ:

- `points_transactions.customer_id` -> `customers.id`
- `points_transactions.order_id` -> `orders.id`

### 11.9 `orders` và `order_items`

`orders`:

```text
id
table_id
account_id
customer_id
promotion_id
status: dang_goi | cho_thanh_toan | da_thanh_toan | huy
total_amount
tax_amount
discount_amount
payment_method: tien_mat | chuyen_khoan | qr
created_at
paid_at
```

`order_items`:

```text
id
order_id
menu_item_id
quantity
price
note
status: cho | dang_nau | hoan_thanh | huy
```

Quan hệ:

- `orders.table_id` -> `tables.id`
- `orders.account_id` -> `accounts.id`
- `orders.customer_id` -> `customers.id`
- `orders.promotion_id` -> `promotions.id`
- `order_items.order_id` -> `orders.id`
- `order_items.menu_item_id` -> `menu_items.id`

### 11.10 `inventory_logs`

Lịch sử nhập/xuất kho.

```text
id
ingredient_id
ingredient_name
type: nhap | xuat
quantity
unit
note
account_id
created_at
```

Điểm hay:

- Có lưu `ingredient_name` và `unit` để sau khi xóa nguyên liệu vẫn xem được lịch sử log.

## 12. Các service backend quan trọng

### 12.1 `orderInventoryService.js`

Các hàm:

- `getMenuItemAvailability(db, menuItemId, options)`
- `getMenuItemsAvailabilityMap(db, options)`
- `checkOrderItemsAvailability(db, items, options)`

Nhiệm vụ:

- Tính món còn bán được bao nhiêu phần.
- Tính theo tồn kho thực tế trừ số lượng đang bị giữ bởi order active.
- Trả về nguyên liệu giới hạn làm món không thể bán thêm.
- Kiểm tra danh sách món trước khi checkout.

### 12.2 `menuAvailabilityService.js`

Các hàm:

- `hideMenuItemsWithOutOfStockIngredients(db, ingredientIds)`
- `showMenuItemsWithAvailableIngredients(db, ingredientIds)`

Nhiệm vụ:

- Ẩn món khi thiếu nguyên liệu.
- Hiện lại món khi nhập kho đủ nguyên liệu.

## 13. Các tính năng theo vai trò

### 13.1 Admin

Admin có các màn:

- Dashboard
- Nhân sự
- Thực đơn
- Kho hàng
- Bàn
- Báo cáo
- Cài đặt
- Khách hàng

Tính năng chi tiết:

- Xem doanh thu ngày và order đang hoạt động.
- Tạo/xóa tài khoản staff/bếp.
- Quản lý danh mục món.
- Quản lý món ăn.
- Ẩn/hiện món.
- Quản lý công thức món.
- Quản lý nguyên liệu.
- Nhập/xuất kho.
- Xem log kho.
- Thêm/xóa bàn.
- Thêm/xóa khu vực.
- Đổi trạng thái bàn.
- Xem báo cáo doanh thu theo ngày/tuần/tháng.
- Xem top món bán chạy.
- Xem báo cáo tồn kho.
- Cấu hình VAT, phương thức thanh toán, thông tin hóa đơn/ngân hàng.
- Xem/xóa khách hàng và lịch sử điểm.

### 13.2 Staff

Staff có các màn:

- Order món
- Quản lý bán hàng
- Khách hàng

Tính năng chi tiết:

- Xem sơ đồ bàn.
- Mở bàn.
- Đặt bàn.
- Chuyển bàn đặt sang đang dùng.
- Vào bàn để gọi món.
- Tìm kiếm/lọc menu.
- Thêm món vào cart.
- Sửa số lượng/giá/note.
- Gửi món xuống bếp.
- Thanh toán bàn.
- Xem lịch sử bán hàng.
- Lọc order theo ngày/tháng/năm/giờ/trạng thái.
- Xem chi tiết hóa đơn.
- Lookup/tạo khách hàng bằng số điện thoại.
- Cập nhật thông tin khách.
- Xem lịch sử điểm khách.

### 13.3 Kitchen

Kitchen có các màn:

- Order bếp
- Thực đơn
- Kho hàng

Tính năng chi tiết:

- Xem món đang chờ/dang nấu.
- Cập nhật món sang đang nấu.
- Cập nhật món sang hoàn thành.
- Xem thời gian chờ.
- Nhận order mới realtime.
- Xem thực đơn.
- Xem kho và log.
- Nhập/xuất kho nếu được cấu hình quyền ở frontend, nhưng không tạo/xóa nguyên liệu.

## 14. Quyền frontend theo feature

File: `restaurant-frontend/src/utils/permissions.js`

`FEATURE_PERMISSIONS` chia quyền cho component dùng chung:

### `adminMenu`

```text
canCreateMenuItem = true
canManageCategories = true
canEditRecipes = true
canToggleMenuItem = true
canDeleteMenuItem = true
```

### `kitchenMenu`

```text
canCreateMenuItem = false
canManageCategories = false
canEditRecipes = false
canToggleMenuItem = false
canDeleteMenuItem = false
```

### `adminWarehouse`

```text
canViewInventory = true
canViewLogs = true
canMoveStock = true
canCreateIngredient = true
canDeleteIngredient = true
```

### `kitchenWarehouse`

```text
canViewInventory = true
canViewLogs = true
canMoveStock = true
canCreateIngredient = false
canDeleteIngredient = false
```

Lưu ý để trả lời:

> Frontend dùng quyền để ẩn/hiện chức năng cho đúng vai trò, còn backend vẫn kiểm tra các API quan trọng bằng `verifyToken` và `isAdmin`.

## 15. Các điểm có thể bị hỏi khi bảo vệ

### 15.1 Vì sao dùng JWT?

Trả lời:

> JWT phù hợp cho REST API vì backend không cần lưu session. Sau khi login, client gửi token trong header, backend verify token để biết user id và role. Token cũng có thời hạn 8 giờ để giảm rủi ro.

### 15.2 Mật khẩu có lưu plain text không?

Trả lời:

> Không. Khi đăng ký/tạo account, backend dùng `bcrypt.hash(password, 10)` để mã hóa. Khi login dùng `bcrypt.compare()`, không giải mã mật khẩu.

### 15.3 Phân quyền được xử lý ở đâu?

Trả lời:

> Có 2 lớp. Frontend dùng `PrivateRoute` và `permissions.js` để điều hướng/ẩn chức năng. Backend dùng `verifyToken` để bắt buộc đăng nhập và `isAdmin` để bảo vệ API quản trị như báo cáo, cài đặt, thêm/sửa/xóa menu, bàn, nguyên liệu.

### 15.4 Vì sao cần Socket.IO?

Trả lời:

> Các thao tác như gửi order xuống bếp, đổi trạng thái món, thanh toán và cập nhật trạng thái bàn cần phản hồi ngay trên nhiều màn hình. Socket.IO giúp backend phát event đến đúng room admin/staff/kitchen, tránh phải refresh thủ công liên tục.

### 15.5 Làm sao tránh bán quá số lượng tồn kho?

Trả lời:

> Hệ thống tính số lượng món có thể bán dựa trên bảng `recipes` và `ingredients`. Ngoài tồn kho hiện tại, backend còn trừ đi phần nguyên liệu đang được giữ bởi các order active. Khi thêm món và checkout đều kiểm tra lại. Nếu thiếu thì trả lỗi hoặc tự giảm số lượng về mức tối đa có thể bán.

### 15.6 Khi thanh toán thì kho bị trừ thế nào?

Trả lời:

> Sau khi checkout thành công, backend lấy các `order_items` status `hoan_thanh`, tìm công thức món trong `recipes`, rồi trừ `ingredients.quantity` theo `recipe.amount * item.quantity`. Sau đó kiểm tra để ẩn món nếu nguyên liệu không còn đủ.

### 15.7 Vì sao có bảng `recipes`?

Trả lời:

> `recipes` là bảng trung gian giữa món ăn và nguyên liệu. Nó cho biết một món cần những nguyên liệu nào và số lượng bao nhiêu. Nhờ đó hệ thống tính được món còn bán được bao nhiêu, tự trừ kho khi thanh toán và tự ẩn món khi thiếu nguyên liệu.

### 15.8 Khi xóa nguyên liệu, log kho có mất ý nghĩa không?

Trả lời:

> Không. Trước khi xóa nguyên liệu, backend cập nhật `inventory_logs` để lưu lại `ingredient_name` và `unit`, sau đó set `ingredient_id = NULL`. Vì vậy lịch sử nhập/xuất vẫn đọc được tên nguyên liệu dù nguyên liệu gốc đã bị xóa.

### 15.9 Tại sao checkout tính lại tổng tiền ở backend?

Trả lời:

> Để tránh phụ thuộc hoàn toàn vào dữ liệu frontend. Backend query lại `order_items`, tính `SUM(price * quantity)`, cộng VAT từ `config`, trừ giảm giá rồi mới cập nhật order. Đây là cách an toàn hơn vì frontend có thể bị sửa dữ liệu.

### 15.10 Các trạng thái quan trọng là gì?

Trả lời ngắn:

- Bàn: `trong`, `dang_dung`, `da_dat`.
- Order: `dang_goi`, `cho_thanh_toan`, `da_thanh_toan`, `huy`.
- Món: `cho`, `dang_nau`, `hoan_thanh`, `huy`.
- Kho log: `nhap`, `xuat`.
- Điểm: `cong`, `tru`.

### 15.11 Nếu bếp hoàn thành món thì order có tự thanh toán không?

Trả lời:

> Không. Bếp chỉ cập nhật trạng thái món sang `hoan_thanh`. Order chỉ chuyển sang `da_thanh_toan` khi staff thực hiện checkout. Nếu bàn được đóng về trống mà đã có món hoàn thành, order có thể chuyển sang `cho_thanh_toan`.

### 15.12 QR mode là gì?

Trả lời:

> Trong `Layout.jsx`, nếu URL có `mode=qr` hoặc `qr=true`, giao diện ẩn sidebar. Điều này phù hợp cho màn order riêng theo bàn hoặc dùng trên thiết bị khách/nhân viên mà không cần menu quản trị.

## 16. Các điểm code cần chú ý hoặc có thể cải thiện

Phần này nên đọc trước khi báo cáo vì giảng viên có thể yêu cầu sửa code hoặc hỏi vì sao.

### 16.1 Backend đang có dependency chưa dùng

Trong `restaurant-backend/package.json` có:

```json
"mongoose": "^9.6.1",
"sequelize": "^6.37.8"
```

Nhưng code hiện tại dùng `mysql2` trực tiếp, không thấy dùng Mongoose/Sequelize. Nếu bị hỏi, có thể nói:

> Đây là dependency thừa từ quá trình phát triển/thử nghiệm, hệ thống hiện tại dùng MySQL qua `mysql2`.

### 16.2 README ghi React 18 nhưng package đang dùng React 19

README ghi:

```text
React 18
```

Nhưng `restaurant-frontend/package.json` đang là:

```json
"react": "^19.2.6"
```

Nếu cần chính xác, nên cập nhật README hoặc khi trình bày nói theo package hiện tại là React 19.

### 16.3 `customerController.js` có định nghĩa trùng hàm

File `customerController.js` có 2 lần:

- `exports.addPoints`
- `updateMembership`

Trong Node.js, phần định nghĩa sau sẽ ghi đè export `addPoints` trước đó. Code vẫn chạy theo phiên bản sau, nhưng nên dọn lại để file gọn và tránh nhầm.

### 16.4 `paymentController.js` gọi `addPointsFromOrder` nhưng chưa import

Trong `paymentController.js`, checkout gọi:

```js
await addPointsFromOrder(customer_id, Number(order_id), final_amount);
```

Nhưng đầu file chưa import hàm này từ `customerController.js`. Nếu chạy checkout với `customer_id`, có thể bị lỗi `addPointsFromOrder is not defined`.

Cách sửa hợp lý:

```js
const { addPointsFromOrder } = require('./customerController');
```

hoặc tách logic điểm sang service riêng như `customerPointsService.js` để controller không import chéo nhau.

### 16.5 `reportController.inventoryReport` xét trạng thái hơi lệch thứ tự

Code:

```sql
CASE 
  WHEN quantity <= min_quantity THEN "sap_het"
  WHEN quantity = 0 THEN "het_hang"
  ELSE "con_hang"
END
```

Nếu `quantity = 0` và `min_quantity >= 0`, điều kiện đầu đã đúng nên trạng thái sẽ là `sap_het`, không tới `het_hang`.

Nên đổi thứ tự:

```sql
CASE 
  WHEN quantity = 0 THEN "het_hang"
  WHEN quantity <= min_quantity THEN "sap_het"
  ELSE "con_hang"
END
```

### 16.6 Token gửi header chưa có tiền tố Bearer

Frontend gửi:

```js
config.headers.authorization = token;
```

Backend cũng đọc trực tiếp:

```js
const token = req.headers['authorization'];
```

Vì hai bên thống nhất nên vẫn chạy. Tuy nhiên chuẩn phổ biến là:

```text
Authorization: Bearer <token>
```

Nếu bị hỏi, trả lời:

> Hiện tại hệ thống dùng token raw để đơn giản hóa. Có thể nâng cấp theo chuẩn Bearer bằng cách frontend thêm `Bearer` và backend tách token sau khoảng trắng.

### 16.7 Register route public

`POST /api/auth/register` hiện public, nhưng không cho tạo admin. UI tạo nhân viên nằm trong admin page, tuy nhiên nếu biết endpoint vẫn có thể gọi tạo staff/bếp.

Cải thiện:

> Nên thêm `verifyToken, isAdmin` cho route register nếu muốn chỉ admin được tạo tài khoản.

### 16.8 Chưa có test tự động

`restaurant-backend/package.json` có script test mặc định:

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

Nếu bị hỏi:

> Hiện dự án tập trung hoàn thiện chức năng và kiểm thử thủ công theo luồng. Nếu phát triển tiếp, nên thêm test API cho auth/order/payment/inventory vì đây là các phần rủi ro cao.

## 17. Gợi ý slide báo cáo

### Slide 1 - Tên đề tài

- NhaHangWow
- Hệ thống quản lý nhà hàng fullstack
- Thành viên nhóm
- Môn học/lớp

### Slide 2 - Vấn đề và mục tiêu

- Nhà hàng cần quản lý bàn, order, bếp, kho, thanh toán, báo cáo.
- Mục tiêu: số hóa quy trình phục vụ, giảm nhầm lẫn, đồng bộ realtime.

### Slide 3 - Tech stack

- Frontend: React, Vite, Tailwind, Axios, React Router, Socket.IO Client.
- Backend: Node.js, Express, JWT, bcrypt, Socket.IO.
- Database: MySQL.

### Slide 4 - Kiến trúc hệ thống

Vẽ sơ đồ:

```text
React -> Express API -> MySQL
React <-> Socket.IO <-> Express
```

### Slide 5 - Database chính

Nhóm bảng:

- User/role: `accounts`, `roles`
- Nhà hàng: `areas`, `tables`, `reservations`
- Menu/kho: `categories`, `menu_items`, `ingredients`, `recipes`, `inventory_logs`
- Bán hàng: `orders`, `order_items`, `promotions`
- Khách hàng: `customers`, `points_transactions`

### Slide 6 - Phân quyền

- Admin
- Staff
- Kitchen
- JWT + middleware + PrivateRoute

### Slide 7 - Luồng order

```text
Mở bàn -> Chọn món -> Kiểm tra kho -> Tạo order -> Gửi bếp realtime
```

### Slide 8 - Luồng bếp

```text
Nhận món realtime -> Đang nấu -> Hoàn thành -> Staff cập nhật trạng thái
```

### Slide 9 - Luồng thanh toán và kho

```text
Checkout -> tính VAT/giảm giá -> cập nhật order -> trừ kho -> cộng điểm -> giải phóng bàn
```

### Slide 10 - Báo cáo và cài đặt

- Doanh thu ngày/tuần/tháng.
- Top món bán chạy.
- Báo cáo tồn kho.
- Cấu hình VAT, phương thức thanh toán, thông tin hóa đơn.

### Slide 11 - Điểm nổi bật

- Realtime bằng Socket.IO.
- Tính tồn kho khả dụng theo công thức món.
- Chống bán vượt tồn kho.
- Tự ẩn/hiện món theo nguyên liệu.
- Khách hàng và điểm tích lũy.

### Slide 12 - Hạn chế và hướng phát triển

- Dọn dependency thừa.
- Chuẩn hóa Bearer token.
- Thêm test tự động.
- Tách service điểm khách hàng.
- Hoàn thiện phân quyền register.
- Thêm in hóa đơn/QR production.

## 18. Kịch bản demo đề xuất

### Demo 1 - Đăng nhập và phân quyền

1. Đăng nhập admin.
2. Vào dashboard.
3. Mở nhân sự/thực đơn/kho/báo cáo.
4. Đăng xuất.
5. Đăng nhập staff hoặc kitchen để thấy menu khác.

Điểm nói:

> Sidebar và route thay đổi theo role. Backend cũng bảo vệ API admin.

### Demo 2 - Staff order và bếp nhận realtime

1. Staff mở bàn trống.
2. Vào order.
3. Chọn món.
4. Gửi bếp.
5. Mở màn kitchen orders.
6. Bếp thấy món mới.
7. Bếp chuyển trạng thái sang đang nấu/hoàn thành.

Điểm nói:

> Socket.IO giúp màn bếp nhận order mới ngay mà không cần refresh.

### Demo 3 - Thanh toán và giải phóng bàn

1. Staff vào payment của bàn.
2. Chọn phương thức thanh toán.
3. Checkout.
4. Bàn chuyển về trống.
5. Order chuyển sang đã thanh toán.
6. Kho bị trừ theo công thức.

Điểm nói:

> Checkout là lúc backend chốt tổng tiền, trừ kho và phát realtime cập nhật bàn.

### Demo 4 - Kho ảnh hưởng menu

1. Vào kho.
2. Xuất nguyên liệu đến mức không đủ.
3. Vào menu/order.
4. Món liên quan bị giới hạn số lượng hoặc ẩn.
5. Nhập kho lại.
6. Món có thể hiện lại.

Điểm nói:

> Menu không độc lập với kho. Mỗi món có recipe, hệ thống tự tính số phần bán được.

### Demo 5 - Khách hàng và điểm

1. Staff lookup khách bằng số điện thoại.
2. Checkout order với customer.
3. Xem điểm và lịch sử điểm.
4. Admin xem danh sách khách.

Điểm nói:

> Khách hàng được cộng điểm theo giá trị hóa đơn, điểm được ghi lịch sử trong bảng `points_transactions`.

## 19. Phần chia công việc có thể trình bày

Nếu nhóm chưa có bảng chia cụ thể, có thể chia theo module:

| Thành viên | Công việc |
|---|---|
| Thành viên 1 | Backend auth, phân quyền, database schema |
| Thành viên 2 | Quản lý bàn, đặt bàn, order staff |
| Thành viên 3 | Bếp realtime, trạng thái món, Socket.IO |
| Thành viên 4 | Menu, kho, công thức, kiểm tra tồn kho |
| Thành viên 5 | Thanh toán, khách hàng, điểm, báo cáo, cài đặt |

Nếu chỉ cần nói phần của bạn:

> Em phụ trách đọc hiểu/tích hợp phần ... gồm các file ..., API ..., và luồng nghiệp vụ ...

Điền cụ thể theo phần bạn thật sự làm để tránh bị hỏi sâu vào phần không nắm.

## 20. File cần đọc trước khi báo cáo

Nên đọc theo thứ tự này:

1. `README.md`
2. `schema.sql`
3. `restaurant-backend/src/app.js`
4. `restaurant-backend/src/config/db.js`
5. `restaurant-backend/src/middleware/authMiddleware.js`
6. `restaurant-frontend/src/App.jsx`
7. `restaurant-frontend/src/services/api.jsx`
8. `restaurant-frontend/src/services/socketService.js`
9. `restaurant-backend/src/controllers/authController.js`
10. `restaurant-backend/src/controllers/orderController.js`
11. `restaurant-backend/src/controllers/paymentController.js`
12. `restaurant-backend/src/services/orderInventoryService.js`
13. `restaurant-backend/src/services/menuAvailabilityService.js`
14. `restaurant-backend/src/controllers/inventoryController.js`
15. `restaurant-backend/src/controllers/tableController.js`
16. `restaurant-backend/src/controllers/customerController.js`
17. `restaurant-frontend/src/pages/staff/TableOrder.jsx`
18. `restaurant-frontend/src/pages/kitchen/Orders.jsx`
19. `restaurant-frontend/src/pages/staff/TablePayment.jsx`
20. `restaurant-frontend/src/components/Menu.jsx`
21. `restaurant-frontend/src/components/Warehouse.jsx`

## 21. Checklist chuẩn bị trước ngày báo cáo

- Chạy được MySQL và import `schema.sql`.
- Có admin đăng nhập được.
- Có dữ liệu mẫu menu/kho.
- Backend chạy ở `localhost:5000`.
- Frontend chạy ở `localhost:5173`.
- Test login đủ 3 role.
- Test mở bàn -> order -> gửi bếp.
- Test bếp đổi trạng thái món.
- Test thanh toán.
- Test kho bị trừ sau thanh toán.
- Test báo cáo admin.
- Chuẩn bị slide theo luồng demo.
- Chuẩn bị câu trả lời về JWT, Socket.IO, database, tồn kho.
- Đọc kỹ các điểm cần cải thiện ở mục 16 để không bị bất ngờ.

## 22. Tóm tắt cực ngắn để nói trong 1 phút

> NhaHangWow là hệ thống quản lý nhà hàng fullstack gồm frontend React và backend Node.js/Express dùng MySQL. Hệ thống có 3 vai trò: admin, nhân viên phục vụ và bếp. Admin quản lý nhân sự, thực đơn, kho, bàn, báo cáo và cài đặt. Nhân viên phục vụ mở bàn, gọi món, gửi bếp và thanh toán. Bếp nhận order realtime bằng Socket.IO và cập nhật trạng thái món. Điểm nổi bật là menu liên kết với kho qua bảng công thức `recipes`, nên hệ thống tính được số phần món còn bán được, tránh bán vượt tồn kho, tự ẩn món khi thiếu nguyên liệu và trừ kho khi thanh toán. Ngoài ra hệ thống có khách hàng, điểm tích lũy, hạng thành viên và báo cáo doanh thu/tồn kho.

