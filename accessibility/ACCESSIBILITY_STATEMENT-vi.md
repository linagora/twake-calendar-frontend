# Tuyên bố về khả năng tiếp cận — Twake Calendar

> **Tình trạng tuân thủ: chưa tuân thủ (chưa thực hiện đánh giá tuân thủ).**
>
> Theo tiêu chuẩn khả năng tiếp cận của Pháp (RGAA 4.1.2): *« Accessibilité : non conforme »*.

*Ngôn ngữ khác: [English](ACCESSIBILITY_STATEMENT-en.md), [français](ACCESSIBILITY_STATEMENT-fr.md),
[русский](ACCESSIBILITY_STATEMENT-ru.md). Đối với các cơ quan hành chính Pháp, phiên bản tiếng Pháp
là phiên bản có giá trị pháp lý.*

Tuyên bố này áp dụng cho ứng dụng web Twake Calendar được phát hành từ kho mã nguồn này:

- ứng dụng lịch yêu cầu đăng nhập (`apps/private`);
- các trang công khai: trang đặt lịch hẹn và trang xem trước sự kiện công khai (`apps/public`).

Tuyên bố được lưu trong kho mã nguồn để mỗi phiên bản đều đi kèm một tuyên bố cập nhật. **Cơ quan
triển khai Twake Calendar vẫn chịu trách nhiệm công bố tuyên bố cho dịch vụ của mình**: hãy sao
chép tài liệu này, hoàn thiện các mục được đánh dấu *[bên triển khai]*, công bố và liên kết ứng
dụng tới tài liệu đó (xem [Dành cho bên triển khai](#dành-cho-bên-triển-khai)).

## Cam kết

LINAGORA cam kết làm cho Twake Calendar có thể tiếp cận được, theo điều 47 của luật số 2005-102
ngày 11 tháng 2 năm 2005 và nghị định số 2019-768 ngày 24 tháng 7 năm 2019 của Pháp. Để thực hiện
điều này, LINAGORA công bố:

- [kế hoạch nhiều năm về khả năng tiếp cận](MULTI_YEAR_PLAN.md);
- kế hoạch hành động của năm hiện tại: [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md).

## Tình trạng tuân thủ

Twake Calendar **chưa tuân thủ** RGAA 4.1.2.

**Chưa có đánh giá tuân thủ RGAA nào được thực hiện**, vì vậy không thể nêu tỷ lệ tuân thủ. Một
đánh giá sơ bộ (rà soát mã nguồn của toàn bộ ứng dụng và kiểm tra tự động các trang công khai) đã
được thực hiện ngày 1 tháng 10 năm 2026; kết quả được công bố tại
[`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md). Các bản sửa lỗi đã được đánh giá lại cùng
ngày: [`A10Y_REAUDIT-2026-10-01.md`](A10Y_REAUDIT-2026-10-01.md),
[`A10Y_REAUDIT-2026-10-01-batch2.md`](A10Y_REAUDIT-2026-10-01-batch2.md).

## Chế độ tương phản cao

Twake Calendar cung cấp một phiên bản giao diện có thể tiếp cận: **chế độ tương phản cao**. Chế độ
này được bật ở chân thanh bên (lịch và cài đặt), ở chân các trang công khai, hoặc trong *Cài đặt ›
Trợ năng*; khi di chuột hoặc dùng bàn phím đến công tắc, phần mô tả sẽ hiển thị. Cài đặt được lưu
trên thiết bị và mặc định tắt.

Khi bật chế độ này: màu sắc đạt tỷ lệ tương phản yêu cầu, tiêu điểm bàn phím hiển thị rõ, liên kết
« Chuyển đến nội dung » xuất hiện ở lần nhấn phím Tab đầu tiên, các trường có nhãn hiển thị và các
trường bắt buộc được đánh dấu, thông báo hiển thị đủ lâu, và mọi văn bản giao diện đều theo ngôn
ngữ đã chọn. Trừ khi có ghi chú khác, các rào cản liệt kê dưới đây liên quan đến cách hiển thị mặc
định.

## Nội dung chưa thể tiếp cận

Đánh giá sơ bộ đã phát hiện, trong số các vấn đề khác, những rào cản sau (danh sách đầy đủ kèm vị
trí trong [`A10Y_AUDIT-2026-10-01.md`](A10Y_AUDIT-2026-10-01.md), tiến độ trong
[`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md)):

- Tiêu điểm bàn phím khó nhận thấy trên hầu hết các điều khiển.
- Một số màu (nút chính, văn bản phụ, liên kết, thông báo lỗi, sự kiện trong lịch) chưa đạt tỷ lệ
  tương phản yêu cầu.
- Không thể dùng bàn phím để mở thẻ liên hệ của người tham gia từ các hộp thoại sự kiện.
- Một số trường của biểu mẫu không có nhãn hiển thị (chỉ có văn bản gợi ý; tên của chúng được cung
  cấp cho công nghệ hỗ trợ), và các trường bắt buộc không được đánh dấu bằng hình ảnh.
- Một số trạng thái (trạng thái tham gia, tính riêng tư) chỉ được thể hiện bằng màu hoặc biểu
  tượng, và các sự kiện trong lịch được đọc mà không có đầy đủ khoảng thời gian và trạng thái.
- Không có liên kết chuyển đến nội dung; tiêu điểm không được di chuyển khi chuyển giữa lịch, cài
  đặt và tìm kiếm.
- Một số thông báo biến mất sau 2 giây.

### Miễn trừ do gánh nặng không tương xứng

Không có.

### Nội dung không thuộc nghĩa vụ tiếp cận

Chưa xác định.

### Hạn chế đã biết và phương án thay thế

- **Kéo thả trong lưới lịch** (tạo, di chuyển hoặc thay đổi độ dài sự kiện bằng chuột): có thể đạt
  được kết quả tương tự bằng bàn phím thông qua nút *Tạo* và biểu mẫu sự kiện (ngày, giờ, thời
  lượng).
- **Di chuyển bằng phím mũi tên trong lưới lịch** không được thành phần lịch hỗ trợ: các sự kiện
  được truy cập bằng phím Tab, và chế độ xem « Lịch trình » liệt kê chúng theo thứ tự.
- **Màu lịch do người dùng chọn** có thể không đủ tương phản: trạng thái sự kiện đang (hoặc sẽ)
  được thể hiện thêm bằng văn bản.

Cách sử dụng bàn phím được mô tả trong [`KEYBOARD.md`](KEYBOARD.md) (bằng tiếng Anh) và trong
*Cài đặt › Trợ năng › Bàn phím*.

## Soạn thảo tuyên bố này

- Tuyên bố được lập ngày **1 tháng 10 năm 2026**, cập nhật ngày **1 tháng 10 năm 2026**.
- Công nghệ sử dụng: HTML5, CSS, JavaScript (React, MUI, FullCalendar), WAI-ARIA.
- Công cụ đánh giá sơ bộ: rà soát mã nguồn, axe-core (qua công cụ quét khả năng tiếp cận tự động)
  trên Chromium.
- Các trang được kiểm tra trong đánh giá sơ bộ: xem mẫu đề xuất trong
  [`A10Y_REMEDIATIONS-2026-10-01.md`](A10Y_REMEDIATIONS-2026-10-01.md) (mục R-01).

## Phản hồi và liên hệ

Nếu bạn không thể truy cập một nội dung hoặc dịch vụ, hãy liên hệ với chúng tôi để được hướng dẫn
đến một phương án thay thế có thể tiếp cận hoặc nhận nội dung dưới dạng khác:

- tạo một yêu cầu (issue) với nhãn `accessibility` tại
  <https://github.com/linagora/twake-calendar-frontend/issues/new?labels=accessibility>;
- *[bên triển khai]*: bổ sung đầu mối liên hệ về khả năng tiếp cận của dịch vụ (địa chỉ email,
  biểu mẫu, địa chỉ bưu chính).

## Biện pháp khiếu nại

Thủ tục này áp dụng khi bạn đã báo cho người phụ trách dịch vụ về một lỗi khả năng tiếp cận khiến
bạn không thể truy cập nội dung hoặc dịch vụ, nhưng không nhận được câu trả lời thỏa đáng. Bạn có
thể:

- gửi tin nhắn cho Défenseur des droits (Thanh tra bảo vệ quyền): <https://formulaire.defenseurdesdroits.fr/>;
- liên hệ đại diện của Défenseur des droits tại khu vực của bạn:
  <https://www.defenseurdesdroits.fr/carte-des-delegues>;
- gửi thư (miễn phí, không cần dán tem):
  Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07.

## Dành cho bên triển khai

1. Sao chép tệp này (hoặc [phiên bản tiếng Pháp](ACCESSIBILITY_STATEMENT-fr.md)) và
   [`MULTI_YEAR_PLAN.md`](MULTI_YEAR_PLAN.md), sau đó hoàn thiện các mục *[bên triển khai]*.
2. Công bố chúng trên trang web của bạn (các cơ quan hành chính Pháp công bố phiên bản tiếng Pháp,
   [`ACCESSIBILITY_STATEMENT-fr.md`](ACCESSIBILITY_STATEMENT-fr.md)).
3. Sau khi đánh giá RGAA cho bản triển khai của bạn được thực hiện, hãy cập nhật tình trạng tuân
   thủ và kết quả đánh giá (ngày, đơn vị đánh giá, mẫu, tỷ lệ) trong bản sao của bạn.
