# Đặc tả yêu cầu – Lumi Store

Website bán đồ công nghệ & phong cách sống, gồm 3 phần: **cửa hàng** cho khách, **trang quản trị** cho chủ shop và **REST API**.

Đặc tả được tổng hợp từ các checklist thương mại điện tử phổ biến (xem mục Tham khảo) và điều chỉnh cho thị trường Việt Nam.

## 1. Vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| Khách vãng lai | Xem, tìm kiếm, thêm vào giỏ, **đặt hàng không cần tài khoản**, tra cứu đơn bằng mã đơn + SĐT |
| Khách hàng (đã đăng ký) | Tất cả quyền của khách vãng lai + sổ địa chỉ, yêu thích, lịch sử đơn, huỷ đơn, đánh giá |
| Quản trị viên | Đăng nhập ở URL riêng `/admin/login`, quản lý toàn bộ cửa hàng |

## 2. Yêu cầu chức năng – Cửa hàng

| ID | Chức năng | Tiêu chí chấp nhận |
|---|---|---|
| C-01 | Trang chủ | Banner trượt, danh mục, Flash sale có đồng hồ đếm ngược, mã giảm giá sao chép 1 chạm, gợi ý/bán chạy/mới/giảm sâu, sản phẩm đã xem |
| C-02 | Danh sách sản phẩm | Lọc theo danh mục, thương hiệu, khoảng giá, số sao, còn hàng, giảm giá; 6 kiểu sắp xếp; phân trang; bộ lọc nằm trên URL (chia sẻ/Back được) |
| C-03 | Tìm kiếm | Không phân biệt dấu ("dong ho" ra "Đồng hồ"); gợi ý tức thì khi gõ; điều hướng bằng phím ↑ ↓ Enter; lịch sử tìm kiếm; phím tắt `/` |
| C-04 | Chi tiết sản phẩm | Thư viện ảnh có zoom, giá & % tiết kiệm, tồn kho, thông số, mô tả, đánh giá có biểu đồ phân bố sao, sản phẩm tương tự, nút Mua ngay |
| C-05 | Giỏ hàng | Lưu ở trình duyệt (khách không cần đăng nhập); đổi số lượng, xoá có **Hoàn tác**; thanh tiến trình freeship; giá/tồn kho được server kiểm tra lại |
| C-06 | Thanh toán | 1 trang, tuyến tính; báo lỗi ngay tại ô; giải thích vì sao cần SĐT; chọn địa chỉ đã lưu; mã giảm giá; COD / VietQR / ví điện tử |
| C-07 | Địa chỉ | Theo địa giới mới: **34 tỉnh/thành → Phường/Xã → số nhà** (không còn cấp quận/huyện từ 1/7/2025) |
| C-08 | Sau đặt hàng | Mã đơn, mã **VietQR** điền sẵn số tiền + nội dung, tóm tắt đơn |
| C-09 | Tài khoản | Đăng ký, đăng nhập, quên/đặt lại mật khẩu, đổi thông tin, đổi mật khẩu |
| C-10 | Đơn hàng của tôi | Lọc theo trạng thái, dòng thời gian xử lý, huỷ khi đang *Chờ xác nhận* (có lý do), Mua lại |
| C-11 | Đánh giá | Chỉ khách **đã nhận hàng** mới được đánh giá; mỗi sản phẩm 1 đánh giá (có thể sửa) |
| C-12 | Yêu thích, Sổ địa chỉ | Thêm/bỏ yêu thích; CRUD địa chỉ, đặt mặc định |
| C-13 | Tra cứu đơn | Khách vãng lai tra cứu bằng mã đơn + SĐT |

## 3. Yêu cầu chức năng – Quản trị

| ID | Chức năng | Tiêu chí chấp nhận |
|---|---|---|
| A-01 | Đăng nhập riêng | URL `/admin/login`; tài khoản không phải admin bị từ chối |
| A-02 | Tổng quan | KPI (doanh thu, đơn, khách mới, giá trị TB/đơn) so với kỳ trước; biểu đồ doanh thu theo ngày; trạng thái đơn; doanh thu theo danh mục; top 5 bán chạy; cảnh báo sắp hết hàng; đơn gần đây; chọn 7/30/90 ngày |
| A-03 | Sản phẩm | Tìm, lọc (danh mục, đang bán/ẩn/sắp hết/hết hàng), sắp xếp; sửa tồn kho ngay trên bảng; bật/tắt hiển thị, nổi bật; thao tác hàng loạt; tải nhiều ảnh, kéo thả sắp xếp; thông số động; cảnh báo khi rời trang chưa lưu |
| A-04 | Xoá an toàn | Sản phẩm đã có đơn sẽ được **ẩn** thay vì xoá để giữ lịch sử |
| A-05 | Danh mục | CRUD, biểu tượng, màu, thứ tự; không cho xoá danh mục còn sản phẩm |
| A-06 | Đơn hàng | Tab trạng thái có số đếm; tìm theo mã/tên/SĐT; lọc theo **ngày, tỉnh/thành, phương thức thanh toán**; xuất CSV (mở được bằng Excel) |
| A-07 | Quy trình đơn | Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao (hoặc Huỷ có lý do). Không cho nhảy cóc. Huỷ đơn tự **hoàn kho** và hoàn lượt mã giảm giá. COD tự chuyển *Đã thanh toán* khi giao xong. In đơn |
| A-08 | Khách hàng | Tìm, lọc, sắp xếp theo chi tiêu/số đơn; khoá/mở khoá; xem chi tiết, địa chỉ, lịch sử mua |
| A-09 | Mã giảm giá | Loại %, số tiền, freeship; giảm tối đa; đơn tối thiểu; giới hạn lượt; thời gian hiệu lực; trạng thái tự tính |
| A-10 | Đánh giá | Lọc theo sao/hiển thị; ẩn/hiện, xoá (điểm trung bình tự tính lại) |
| A-11 | Banner | CRUD banner trang chủ, ảnh hoặc màu gradient |
| A-12 | Cài đặt | Thông tin shop, phí ship, ngưỡng freeship, tài khoản ngân hàng cho VietQR, ngưỡng cảnh báo tồn kho |

## 4. Quy tắc nghiệp vụ

- **Giá luôn do server tính** (`/api/cart/quote`), không tin giá từ trình duyệt.
- Trừ kho trong cùng transaction với tạo đơn, kèm điều kiện `stock >= số lượng` để **không bán quá tồn kho** khi nhiều người mua cùng lúc.
- Phí ship 30.000₫, miễn phí cho đơn từ 500.000₫ (chỉnh trong Cài đặt).
- Mã đơn dạng `LMyymmddXXXXX`, không dùng ký tự dễ nhầm (0/O, 1/I).

## 5. Yêu cầu phi chức năng

| Nhóm | Cách đáp ứng |
|---|---|
| Bảo mật | Mật khẩu băm bcrypt; JWT; phân quyền admin ở server; giới hạn số lần đăng nhập (rate limit); Helmet; kiểm tra dữ liệu bằng Zod; không lộ lỗi nội bộ |
| Dễ dùng | Thông báo lỗi tiếng Việt rõ ràng tại từng ô; skeleton khi tải; trạng thái trống có hướng dẫn; xác nhận trước thao tác nguy hiểm; Hoàn tác khi xoá khỏi giỏ |
| Responsive | Thanh điều hướng dưới cho điện thoại, thanh Mua ngay dính đáy, bộ lọc dạng ngăn kéo; admin có sidebar thu gọn |
| Truy cập | Nhãn ARIA, điều hướng bằng bàn phím, focus rõ ràng, tôn trọng *giảm chuyển động* |
| Hiệu năng | Trang admin tách gói riêng (khách không tải); ảnh lazy-load; truy vấn có index |
| Kiểm thử | 11 bài test tích hợp API (`npm test`) |

## 6. Tham khảo

- [eCommerce Website Requirements: The Essential Checklist – Core dna](https://coredna.com/blogs/eCommerce-website-requirements)
- [30 Major Requirements for Ecommerce Websites – DigitalSuits](https://digitalsuits.co/blog/10-major-requirements-for-e-commerce-website)
- [E-commerce Website Features: Admin Panel – SECL Group](https://seclgroup.com/top-ecommerce-website-features-part-2/)
- [Checkout Form Best Practices – Baymard Institute](https://baymard.com/blog/checkout-form-best-practices)
- [Checkout UX Guide – Baymard Institute](https://baymard.com/blog/checkout-flow-ux-optimization)
- [Tên gọi 34 đơn vị hành chính cấp tỉnh – LuatVietnam](https://luatvietnam.vn/hanh-chinh/ten-goi-34-don-vi-hanh-chinh-cap-tinh-tu-01-9-2025-570-101694-article.html)
