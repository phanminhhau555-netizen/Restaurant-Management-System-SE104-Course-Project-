# Báo cáo fix bug Add Table - 2026-06-04

## Tóm tắt

Đã rà soát toàn bộ project frontend/backend liên quan đến lỗi không thêm được bàn mới. Nguyên nhân chính là backend đã thêm logic tạo mã QR cho bàn bằng cột `qr_token`, nhưng database/schema hiện tại chưa có cột này trong bảng `tables`.

Khi bấm thêm bàn, backend gọi:

```sql
INSERT INTO tables (name, area_id, qr_token) VALUES (?, ?, ?)
```

Nếu database chưa có cột `qr_token`, MySQL sẽ trả lỗi kiểu:

```text
Unknown column 'qr_token' in 'field list'
```

## Những phần đã sửa

### 1. Sửa lỗi không thêm được bàn

Đã thêm cột `qr_token` vào schema gốc:

- `schema.sql`

Thay đổi:

```sql
qr_token VARCHAR(36) NOT NULL UNIQUE
```

### 2. Thêm migration cho database đang chạy

Đã tạo migration:

- `restaurant-backend/src/migrations/20260604_add_table_qr_token.sql`

Migration này thực hiện:

- Thêm cột `qr_token` vào bảng `tables`
- Tự sinh UUID cho các bàn đã tồn tại
- Chuyển cột sang `NOT NULL`
- Thêm unique index `uq_tables_qr_token`

### 3. Đã áp migration vào database local

Đã chạy migration trực tiếp trên database local từ cấu hình `.env` backend.

Kết quả:

```text
Added tables.qr_token
Added unique index uq_tables_qr_token
```

Sau bước này, chức năng thêm bàn có đủ cột DB để hoạt động.

### 4. Sửa lỗi lint/frontend khác phát hiện khi scan

Trong quá trình scan, frontend có một số lỗi lint và hook warning. Đã sửa các file:

- `restaurant-frontend/src/pages/staff/Tables.jsx`
- `restaurant-frontend/src/pages/staff/StaffSalesPage.jsx`
- `restaurant-frontend/src/pages/admin/Customers.jsx`
- `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx`
- `restaurant-frontend/src/pages/staff/TableOrder.jsx`

Các nhóm lỗi đã xử lý:

- Hàm fetch dữ liệu bị gọi trước vị trí khai báo
- Gọi cập nhật state trong `useEffect` theo cách bị React lint cảnh báo
- Biến khai báo nhưng không dùng
- `catch` rỗng hoặc biến lỗi không dùng
- Dependency thừa trong hook
- Log debug còn sót trong trang bán hàng

## Chi tiết từng lỗi lint đã phát hiện và sửa

### 1. `restaurant-frontend/src/pages/admin/Customers.jsx`

Lỗi:

```text
react-hooks/set-state-in-effect
Calling setState synchronously within an effect can trigger cascading renders
```

Vị trí ban đầu:

```text
useEffect(() => {
  fetchCustomers();
}, []);
```

Nguyên nhân:

`fetchCustomers()` có gọi `setLoading`, `setCustomers`, `setError`. React lint cảnh báo vì gọi một hàm cập nhật state trực tiếp trong thân `useEffect` có thể gây render dây chuyền.

Cách sửa:

- Tách riêng hàm load dữ liệu trong `useEffect`
- Thêm biến `cancelled` để tránh cập nhật state sau khi component đã unmount
- Giữ lại `fetchCustomers()` cho các hành động sau này như xóa khách hàng, nhưng cho phép gọi không bật loading toàn trang

Lỗi khác:

```text
no-unused-vars
'Icon' is defined but never used
```

Nguyên nhân:

Danh sách thống kê membership có destructuring `icon: Icon`, nhưng UI không render `Icon`.

Cách sửa:

- Bỏ trường `icon` khỏi mảng stats
- Bỏ destructuring `icon: Icon`

### 2. `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx`

Lỗi:

```text
no-unused-vars
'res' is assigned a value but never used
```

Vị trí ban đầu:

```text
const res = await API.put(...)
```

Nguyên nhân:

Kết quả trả về của API update khách hàng được gán vào `res` nhưng không dùng tiếp.

Cách sửa:

- Đổi thành `await API.put(...)`
- Bỏ biến `res`

### 3. `restaurant-frontend/src/pages/staff/StaffSalesPage.jsx`

Lỗi:

```text
no-unused-vars
'e' is defined but never used
```

Vị trí ban đầu:

```text
catch (e) {}
```

Nguyên nhân:

Biến `e` được khai báo trong `catch` nhưng không dùng.

Cách sửa:

- Đổi thành `catch { ... }`
- Thêm comment giải thích fallback dùng cấu hình ngân hàng mặc định nếu `invoice_template` không phải JSON

Lỗi:

```text
no-empty
Empty block statement
```

Nguyên nhân:

Block `catch` rỗng hoàn toàn.

Cách sửa:

- Không để `catch` rỗng
- Thêm comment ngắn giải thích vì sao lỗi có thể bỏ qua

Lỗi:

```text
react-hooks/immutability
Cannot access variable before it is declared
fetchOrders is accessed before it is declared
```

Nguyên nhân:

`useEffect` gọi `fetchOrders()` trước khi `fetchOrders` được khai báo bằng `const fetchOrders = async () => { ... }`. Với function expression dạng `const`, lint không coi đây là hoisted function an toàn.

Cách sửa:

- Di chuyển `fetchOrders` lên trước `useEffect`
- Tách riêng logic load ban đầu trong `useEffect`
- Thêm `cancelled` guard để tránh set state sau unmount

Warning:

```text
react-hooks/exhaustive-deps
React Hook useEffect has a missing dependency: 'checkoutMethod'
```

Nguyên nhân:

Effect đọc `checkoutMethod` để kiểm tra phương thức thanh toán, nhưng dependency array để trống.

Cách sửa:

- Không đọc trực tiếp `checkoutMethod` trong effect
- Dùng functional update:

```text
setCheckoutMethod((currentMethod) =>
  methods.length > 0 && !methods.includes(currentMethod) ? methods[0] : currentMethod
);
```

Lỗi logic/phụ trợ đã dọn:

```text
console.log debug còn sót trong filteredOrders
```

Nguyên nhân:

Trang bán hàng còn log debug từng đơn hàng khi filter.

Cách sửa:

- Xóa các dòng `console.log`
- Bỏ biến debug `isMatch`

### 4. `restaurant-frontend/src/pages/staff/Tables.jsx`

Lỗi:

```text
react-hooks/immutability
Cannot access variable before it is declared
fetchTables is accessed before it is declared
```

Nguyên nhân:

`useEffect` gọi `fetchTables()` trước khi hàm này được khai báo bằng `const fetchTables = async () => { ... }`.

Cách sửa:

- Đưa hàm `fetchTables` lên trước `useEffect`
- Sau đó lint vẫn cảnh báo thêm về set state trong effect, nên tiếp tục tách logic load ban đầu ra riêng trong `useEffect`

Lỗi tiếp theo:

```text
react-hooks/set-state-in-effect
Calling setState synchronously within an effect can trigger cascading renders
```

Nguyên nhân:

`fetchTables()` cập nhật `tables`, `areas`, `loading`; gọi trực tiếp trong effect bị lint cảnh báo.

Cách sửa:

- Tạo `loadTables` riêng bên trong `useEffect`
- Thêm `cancelled` guard
- Chỉ dùng `fetchTables()` cho các thao tác sau khi người dùng cập nhật trạng thái bàn
- Guard thêm cả request lấy `server-ip`

### 5. `restaurant-frontend/src/pages/staff/TableOrder.jsx`

Warning:

```text
react-hooks/exhaustive-deps
React Hook useCallback has an unnecessary dependency: 'tableId'
```

Nguyên nhân:

`fetchData` không dùng trực tiếp `tableId` trong body sau khi đã khởi tạo `resolvedTableId`, nhưng dependency array vẫn có `tableId`.

Cách sửa:

- Bỏ `tableId` khỏi dependency array
- Giữ lại `token` và `resolvedTableId`

### 6. Kết quả lint sau khi sửa

Sau các thay đổi trên, chạy lại:

```text
npm run lint
```

Kết quả:

```text
pass
```

## Kết quả kiểm tra

Đã chạy lại các bước kiểm tra chính:

```text
npm run lint
```

Kết quả: pass.

```text
npm run build
```

Kết quả: pass.

```text
Backend JS syntax scan
```

Kết quả: pass.

## Ghi chú

Frontend build vẫn có warning bundle lớn hơn 500 kB. Đây là cảnh báo tối ưu hiệu năng, không phải lỗi làm hỏng chức năng.

Do đã chạy build frontend, thư mục `restaurant-frontend/dist` cũng được cập nhật lại theo bản build mới.
