# Báo cáo audit bug, code thừa và chức năng chưa hoàn thiện

Ngày rà soát: 2026-06-04  
Phạm vi: `restaurant-frontend/src`, `restaurant-backend/src`, `schema.sql`

## Tóm tắt nhanh

Project build/lint hiện không lỗi cú pháp, nhưng có một số vấn đề nghiệp vụ và code thừa đáng xử lý:

- Page `staff/reservations` vẫn còn route nhưng không xuất hiện trong menu nhân viên, dễ xem là page mồ côi.
- Luồng đặt bàn đang bị tách làm hai kiểu lưu dữ liệu: `tables.reserved_at` và bảng `reservations`, gây lệch lịch đặt bàn.
- Một số nút/form trông có chức năng nhưng chưa thực sự xử lý, rõ nhất là nút `Ngày / Tuần / Tháng` ở Dashboard và lý do đóng bàn.
- Backend có hàm bị khai báo trùng, trong đó bản cũ bị ghi đè và trở thành code chết.
- Một vài báo cáo hiển thị sai vì frontend/backend chưa thống nhất shape dữ liệu.

## Kết quả kiểm tra tự động

- `restaurant-frontend`: `npm run build` chạy thành công.
- `restaurant-frontend`: `npm run lint` chạy thành công.
- `restaurant-backend`: `node --check src/app.js` chạy thành công.
- Ghi chú: Vite cảnh báo bundle JS sau minify lớn hơn 500 kB, chưa phải lỗi chạy app nhưng nên xem xét code splitting về sau.

## Bug và rủi ro chính

### 1. Page `staff/reservations` mồ côi / không còn nằm trong luồng chính

Mức độ: Trung bình

Bằng chứng:

- `restaurant-frontend/src/App.jsx:14` vẫn import `StaffReservationsPage`.
- `restaurant-frontend/src/App.jsx:59` vẫn khai báo route `/staff/reservations`.
- `restaurant-frontend/src/components/Sidebar.jsx:36` khai báo `staffItems`, nhưng không có item nào trỏ tới `/staff/reservations`.
- `restaurant-frontend/src/pages/staff/Tables.jsx:345-351` đã có block `Đặt bàn sắp tới` trong page staff tables.

Ảnh hưởng:

- Người dùng bình thường không thấy page này trong sidebar, nhưng page vẫn tồn tại và có thể truy cập trực tiếp bằng URL.
- Dễ phát sinh hai màn hình cùng xử lý đặt bàn nhưng logic không đồng bộ.

Đề xuất:

- Nếu không dùng nữa: xóa import, route và file `restaurant-frontend/src/pages/staff/Reservations.jsx`.
- Nếu vẫn muốn dùng: thêm lại item menu `Đặt bàn` trong `staffItems`, đồng thời hợp nhất luồng dữ liệu với `Tables.jsx`.

### 2. Luồng đặt bàn đang bị chia đôi dữ liệu

Mức độ: Cao

Bằng chứng:

- `schema.sql:47` có `tables.reserved_at`.
- `schema.sql:53-60` có bảng riêng `reservations`.
- `restaurant-frontend/src/pages/staff/Tables.jsx:127-133` đặt trước bàn bằng cách gọi `handleUpdateTableStatus(..., "da_dat", reserveTime)`.
- `restaurant-frontend/src/pages/staff/Tables.jsx:106` gửi `reserved_at` vào API cập nhật trạng thái bàn.
- `restaurant-backend/src/controllers/tableController.js:148-158` cập nhật `tables.status` và `tables.reserved_at`.
- `restaurant-frontend/src/pages/staff/Reservations.jsx:97-103` lại tạo đặt bàn bằng `POST /api/tables/reservations`.
- `restaurant-backend/src/controllers/tableController.js:210-217` insert vào `reservations` rồi chỉ set `tables.status="da_dat"`, không set `reserved_at`.

Ảnh hưởng:

- Đặt bàn từ page staff tables hiện tại chỉ ghi `tables.reserved_at`, không tạo bản ghi trong `reservations`.
- Danh sách `Đặt bàn sắp tới` ở `Tables.jsx:606-613` lại đọc từ `/api/tables/reservations/all`, nên các đặt bàn tạo từ modal hiện tại có thể không xuất hiện trong danh sách.
- Đặt bàn từ page `Reservations.jsx` tạo bản ghi `reservations`, nhưng không set `reserved_at`, nên badge giờ đặt trên sơ đồ bàn có thể không hiện thời gian.

Đề xuất:

- Chọn một nguồn dữ liệu chính cho đặt bàn. Nên dùng bảng `reservations` làm nguồn chính, còn `tables.status/reserved_at` chỉ là trạng thái hiển thị hoặc bỏ `reserved_at`.
- Khi đặt bàn ở `Tables.jsx`, gọi API tạo reservation thay vì chỉ patch table status.
- Khi tạo reservation, cập nhật đầy đủ trạng thái bàn và thời gian giữ bàn trong cùng một transaction.

### 3. Reservation không được cập nhật trạng thái khi khách đã tới

Mức độ: Cao

Bằng chứng:

- `schema.sql:60` định nghĩa reservation status: `cho`, `da_den`, `huy`.
- `restaurant-frontend/src/pages/staff/Reservations.jsx:138-146` nút `Nhận khách` chỉ gọi `PATCH /api/tables/:id/status` với `status: "dang_dung"`.
- `restaurant-backend/src/controllers/tableController.js:234-240` danh sách reservation lấy tất cả record, không lọc hoặc cập nhật status.
- `restaurant-backend/src/controllers/tableController.js:111-120` không cho xóa bàn nếu còn reservation `status = "cho"`.

Ảnh hưởng:

- Khách đã nhận bàn nhưng reservation vẫn có thể ở trạng thái `cho`.
- Bàn có reservation cũ có thể bị chặn xóa về sau vì backend vẫn xem là lịch đặt đang chờ.
- Lịch đặt bàn có thể phình ra theo thời gian vì không có luồng hủy/hoàn tất.

Đề xuất:

- Thêm API cập nhật reservation: `PATCH /api/tables/reservations/:id/status`.
- Khi bấm `Nhận khách`, cập nhật reservation sang `da_den` trong cùng thao tác chuyển bàn sang `dang_dung`.
- `getAllReservations` nên lọc mặc định các lịch sắp tới hoặc status `cho`.

### 4. Dashboard có nút thời gian chưa có chức năng

Mức độ: Trung bình

Bằng chứng:

- `restaurant-frontend/src/pages/admin/Dashboard.jsx:113-120` render các nút `Ngày`, `Tuần`, `Tháng`.
- Các button này không có `onClick`, state tab, hoặc gọi API tương ứng.
- `restaurant-frontend/src/pages/admin/Report.jsx:125` là ví dụ đúng: nút tab có `onClick={() => setTab(item.key)}`.

Ảnh hưởng:

- Người dùng bấm `Tuần` hoặc `Tháng` nhưng dữ liệu không đổi.
- Giao diện tạo kỳ vọng có filter nhưng thực tế chỉ hard-code `Ngày` active.

Đề xuất:

- Nếu Dashboard chỉ hiển thị ngày: bỏ hai nút `Tuần`, `Tháng`.
- Nếu muốn lọc thật: thêm state `period`, gọi `/api/reports/revenue/day|week|month` và đổi label/chỉ số theo period.

### 5. Dashboard luôn hiển thị `Tổng khách hàng` bằng 0

Mức độ: Trung bình

Bằng chứng:

- `restaurant-frontend/src/pages/admin/Dashboard.jsx:51-54` state có `tong_mon`, không có `tong_khach`.
- `restaurant-frontend/src/pages/admin/Dashboard.jsx:68-71` `setStats` chỉ set `doanh_thu` và `tong_don`.
- `restaurant-frontend/src/pages/admin/Dashboard.jsx:136` hiển thị `stats.tong_khach || 0`.
- `restaurant-backend/src/controllers/reportController.js:4-32` API doanh thu ngày không trả về tổng khách hàng.

Ảnh hưởng:

- Card `Tổng khách hàng` trên dashboard gần như luôn là `0`, gây sai số liệu.

Đề xuất:

- Gọi thêm `/api/customers` và dùng `length`, hoặc thêm endpoint/stats backend trả `tong_khach`.
- Xóa `tong_mon` nếu không dùng.

### 6. Tab báo cáo tuần sai shape dữ liệu

Mức độ: Cao

Bằng chứng:

- `restaurant-frontend/src/pages/admin/Report.jsx:77-83` set `revenue` bằng response của `/api/reports/revenue/${tab}`.
- `restaurant-frontend/src/pages/admin/Report.jsx:148-159` luôn đọc `revenue.tong_doanh_thu` và `revenue.tong_don`.
- `restaurant-frontend/src/pages/admin/Report.jsx:186-211` tab không phải day lại đọc `revenue.chi_tiet`.
- `restaurant-backend/src/controllers/reportController.js:40-53` `revenueByWeek` trả trực tiếp `res.json(rows)`.
- `restaurant-backend/src/controllers/reportController.js:86-90` `revenueByMonth` trả object có `tong_don`, `tong_doanh_thu`, `chi_tiet`.

Ảnh hưởng:

- Tab `Tuần` có thể hiện tổng doanh thu, tổng đơn và chart là 0/rỗng dù backend có rows.

Đề xuất:

- Chuẩn hóa API tuần trả cùng shape với tháng:
  - `tong_don`
  - `tong_doanh_thu`
  - `chi_tiet`
- Hoặc frontend cần normalize response nếu API trả mảng.

### 7. Cảnh báo hết hàng không bao giờ vào nhóm `het_hang`

Mức độ: Trung bình

Bằng chứng:

- `restaurant-backend/src/controllers/reportController.js:131-132` CASE kiểm tra `quantity <= min_quantity` trước `quantity = 0`.
- `restaurant-backend/src/controllers/reportController.js:155-156` sau đó tách `canh_bao_sap_het` và `canh_bao_het_hang` dựa vào `trang_thai`.

Ảnh hưởng:

- Nguyên liệu có số lượng `0` cũng thỏa `quantity <= min_quantity`, nên bị phân loại `sap_het` trước.
- UI cảnh báo `Hết nguyên liệu` có thể không bao giờ nhận item hết hàng.

Đề xuất:

- Đổi thứ tự CASE:
  - `WHEN quantity = 0 THEN "het_hang"`
  - `WHEN quantity <= min_quantity THEN "sap_het"`

### 8. Modal đóng bàn bắt nhập lý do nhưng không lưu lý do

Mức độ: Trung bình

Bằng chứng:

- `restaurant-frontend/src/pages/staff/Tables.jsx:38` có state `closeReason`.
- `restaurant-frontend/src/pages/staff/Tables.jsx:114-124` bắt nhập lý do rồi gọi `handleUpdateTableStatus(closeTableData.id, "trong")`.
- `restaurant-frontend/src/pages/staff/Tables.jsx:486-488` textarea cho nhập lý do.
- `restaurant-backend/src/controllers/tableController.js:149` API update status chỉ nhận `{ status, reserved_at }`.

Ảnh hưởng:

- Người dùng nghĩ lý do đóng bàn được ghi nhận, nhưng dữ liệu bị bỏ sau khi xác nhận.
- Khó audit ca làm hoặc truy vết lý do hủy/đóng bàn.

Đề xuất:

- Nếu không cần lưu: bỏ textarea và chỉ confirm đóng bàn.
- Nếu cần lưu: thêm bảng log/table note, gửi `close_reason` lên backend và lưu theo order/table event.

### 9. Xóa hóa đơn không giải phóng bàn

Mức độ: Cao

Bằng chứng:

- `restaurant-frontend/src/pages/staff/StaffSalesPage.jsx:480` và `728` gọi `DELETE /api/orders/:id`.
- `restaurant-backend/src/controllers/orderController.js:300-312` xóa `order_items` và `orders`, nhưng không cập nhật `tables.status`.
- Không có emit `TABLE_STATUS_UPDATED` sau khi xóa order.

Ảnh hưởng:

- Nếu xóa một hóa đơn/order đang mở, bàn có thể vẫn ở trạng thái `dang_dung` nhưng không còn active order.
- Nhân viên phải thao tác thêm hoặc dữ liệu bàn bị kẹt.

Đề xuất:

- Trước khi xóa order, lấy `table_id` và `status`.
- Nếu order đang mở (`dang_goi` hoặc `cho_thanh_toan`), cập nhật bàn về `trong` và emit realtime.
- Bọc thao tác xóa order, xóa item, cập nhật bàn trong transaction.

### 10. QR mode mở rộng quyền quá nhiều

Mức độ: Cao

Bằng chứng:

- `restaurant-frontend/src/App.jsx:28-29` bỏ qua đăng nhập nếu URL có `mode=qr` hoặc `/orders/qr/`.
- `restaurant-frontend/src/services/api.jsx:21-23` tự thêm header `x-qr-mode: true`.
- `restaurant-backend/src/middleware/authMiddleware.js:6-7` nếu có header này thì gán user giả `role_id: 2`.
- Nhiều route staff-level chỉ cần `verifyToken`, ví dụ:
  - `restaurant-backend/src/routes/orderRoutes.js:5-14`
  - `restaurant-backend/src/routes/paymentRoutes.js:6-9`
  - `restaurant-backend/src/routes/customerRoutes.js:5-15`
  - `restaurant-backend/src/routes/inventoryRoutes.js:7-8,14-16,19`

Ảnh hưởng:

- Header `x-qr-mode: true` có thể mở quyền gọi nhiều API không chỉ riêng gọi món QR.
- Khách QR bị giả lập thành staff, có thể dẫn tới truy cập sai phạm vi nếu gọi API trực tiếp.

Đề xuất:

- Tạo middleware riêng cho QR, chỉ cho phép:
  - lấy thông tin bàn theo token,
  - xem menu public,
  - tạo/thêm món cho đúng table token.
- Không dùng `role_id: STAFF` giả cho toàn bộ API.
- Các route thanh toán, khách hàng, kho, lịch sử order nên yêu cầu token thật.

### 11. Thanh toán thiếu transaction

Mức độ: Trung bình

Bằng chứng:

- `restaurant-backend/src/controllers/paymentController.js:97-184` checkout thực hiện nhiều bước: kiểm tra order, ghi món, update order, update table, cộng điểm, trừ kho.
- Không thấy `beginTransaction`, `commit`, `rollback` trong luồng checkout.

Ảnh hưởng:

- Nếu lỗi xảy ra giữa chừng, ví dụ đã update order thành `da_thanh_toan` nhưng trừ kho lỗi, dữ liệu có thể lệch.
- Điểm khách hàng, trạng thái bàn và tồn kho có thể không đồng bộ.

Đề xuất:

- Dùng transaction cho toàn bộ checkout.
- Chỉ emit realtime sau khi commit thành công.

## Hàm / code thừa hoặc trùng lặp

### 1. `customerController` khai báo trùng `addPoints`

Bằng chứng:

- `restaurant-backend/src/controllers/customerController.js:122` khai báo `exports.addPoints` lần 1.
- `restaurant-backend/src/controllers/customerController.js:260` khai báo `exports.addPoints` lần 2.

Ảnh hưởng:

- Bản ở dòng 122 bị ghi đè bởi bản ở dòng 260, trở thành code chết.
- Dễ hiểu nhầm khi sửa bug tích điểm.

Đề xuất:

- Xóa bản cũ ở dòng 122-137.
- Giữ bản có ghi log `points_transactions`.

### 2. `customerController` khai báo trùng `updateMembership`

Bằng chứng:

- `restaurant-backend/src/controllers/customerController.js:173` có `async function updateMembership`.
- `restaurant-backend/src/controllers/customerController.js:285` có `async function updateMembership` lần nữa.

Ảnh hưởng:

- Hai bản có ngưỡng hạng bạc khác nhau: bản cũ dùng `2000`, bản mới dùng `1000`.
- Dễ tạo bug nếu người sau đọc/sửa nhầm bản cũ.

Đề xuất:

- Chỉ giữ một `updateMembership`.
- Đưa ngưỡng hạng thành hằng số dùng chung.

### 3. Component/hằng số membership bị lặp giữa admin và staff

Bằng chứng:

- `restaurant-frontend/src/pages/admin/Customers.jsx:16` khai báo `MEMBERSHIP`.
- `restaurant-frontend/src/pages/admin/Customers.jsx:40` khai báo `MembershipBadge`.
- `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx:17` khai báo `MEMBERSHIP`.
- `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx:50` khai báo `MembershipBadge`.
- `restaurant-frontend/src/pages/admin/Customers.jsx:406` và `restaurant-frontend/src/pages/staff/StaffCustomersPage.jsx:466` đều có `formatDateTime`.

Ảnh hưởng:

- Khi đổi ngưỡng hoặc style hạng thành viên, phải sửa nhiều nơi.
- Rủi ro lệch UI/logic giữa staff và admin.

Đề xuất:

- Tách `MEMBERSHIP`, `MembershipBadge`, `formatDateTime` sang module dùng chung, ví dụ `src/components/customer/MembershipBadge.jsx` và `src/utils/formatters.js`.

### 4. `formatMoney` bị lặp ở nhiều page

Bằng chứng:

- `restaurant-frontend/src/pages/admin/Dashboard.jsx:83`
- `restaurant-frontend/src/pages/staff/StaffSalesPage.jsx:266`
- `restaurant-frontend/src/pages/staff/TablePayment.jsx:127`
- `restaurant-frontend/src/pages/staff/TableOrder.jsx:554`

Ảnh hưởng:

- Format tiền có thể lệch style (`amount || 0`, thiếu fallback, thêm `đ`) giữa các màn.

Đề xuất:

- Tạo `src/utils/formatters.js` với `formatMoney`, `formatDateTime`.

## Các mục nên ưu tiên xử lý

1. Chuẩn hóa luồng đặt bàn: chọn bảng `reservations` làm nguồn chính, sửa `Tables.jsx`, `Reservations.jsx`, `tableController.js`.
2. Sửa báo cáo tuần và phân loại tồn kho hết hàng.
3. Sửa Dashboard: bỏ hoặc làm thật nút `Ngày/Tuần/Tháng`, lấy đúng tổng khách hàng.
4. Siết lại QR mode để không giả lập staff cho toàn bộ API.
5. Dọn code chết trong `customerController` và tách formatter/component dùng chung.
6. Quyết định xóa hoặc khôi phục page `/staff/reservations`.

## Ghi chú kiểm thử còn thiếu

- Backend chưa có test thật; `restaurant-backend/package.json` vẫn để script test mặc định lỗi.
- Frontend chưa có test UI cho các luồng quan trọng như đặt bàn, đóng bàn, thanh toán, báo cáo.
- Nên thêm test tối thiểu cho:
  - đặt bàn từ staff tables phải tạo reservation,
  - nhận khách phải đổi reservation sang `da_den`,
  - tab tuần của báo cáo phải có tổng và chart,
  - checkout rollback khi một bước thất bại,
  - QR mode chỉ truy cập được endpoint cho phép.
