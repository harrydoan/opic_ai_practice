# Hướng dẫn triển khai và khắc phục sự cố

## Cấu hình biến môi trường trên Netlify

### 1. CloudConvert API Key
- Đăng ký tài khoản tại [CloudConvert](https://cloudconvert.com/)
- Tạo API key trong dashboard
- Thêm biến môi trường trên Netlify:
  - **Key**: `CLOUDCONVERT_API_KEY`
  - **Value**: API key từ CloudConvert

### 2. Các biến môi trường khác (nếu có)
- `OPENROUTER_API_KEY` - cho chức năng AI
- Các biến khác theo yêu cầu

## Kiểm tra cấu hình

### 1. Test API trực tiếp
Truy cập: `https://your-site.netlify.app/.netlify/functions/test-cloudconvert`

Kết quả mong đợi:
```json
{
  "status": "SUCCESS",
  "message": "CloudConvert API key is valid",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com"
  }
}
```

### 2. Test từ giao diện
- Vào tab "Thi thử"
- Bấm nút "Test API" trong phần "Kiểm tra cấu hình"
- Kiểm tra kết quả hiển thị

## Khắc phục sự cố

### Lỗi "Missing CloudConvert API key"
**Nguyên nhân**: Biến môi trường `CLOUDCONVERT_API_KEY` chưa được cấu hình
**Giải pháp**:
1. Kiểm tra biến môi trường trên Netlify dashboard
2. Đảm bảo tên biến chính xác: `CLOUDCONVERT_API_KEY`
3. Redeploy ứng dụng sau khi thêm biến

### Lỗi "CloudConvert API test failed"
**Nguyên nhân**: API key không hợp lệ hoặc hết hạn
**Giải pháp**:
1. Tạo API key mới trên CloudConvert
2. Cập nhật biến môi trường
3. Redeploy ứng dụng

### Lỗi "Failed to convert file to MP3"
**Nguyên nhân**: 
- File quá lớn (>10MB)
- Timeout trong quá trình convert
- Lỗi mạng

**Giải pháp**:
1. Giảm thời lượng ghi âm
2. Kiểm tra kết nối mạng
3. Thử lại sau vài phút
4. Sử dụng tính năng "Tải file webm (dự phòng)"

### Lỗi "Method not allowed"
**Nguyên nhân**: Function không được cấu hình đúng
**Giải pháp**:
1. Kiểm tra file `netlify.toml`
2. Đảm bảo functions được build đúng cách
3. Redeploy toàn bộ ứng dụng

## Cấu trúc file quan trọng

```
netlify/
├── functions/
│   ├── convert-webm-to-mp3.js    # Convert webm to mp3
│   ├── test-cloudconvert.js      # Test API configuration
│   └── visitor-count.js          # Visitor statistics
├── edge-functions/
│   └── whisper-to-text.js        # Speech to text
└── netlify.toml                  # Netlify configuration
```

## Logs và Debug

### Xem logs trên Netlify
1. Vào Netlify dashboard
2. Chọn site
3. Vào tab "Functions"
4. Xem logs của function `convert-webm-to-mp3`

### Debug từ browser
1. Mở Developer Tools (F12)
2. Vào tab Console
3. Thực hiện convert mp3
4. Xem các log messages

## Tối ưu hóa

### Giảm timeout
- Hiện tại: 30 giây (10 lần poll, mỗi lần 3 giây)
- Có thể điều chỉnh trong `convert-webm-to-mp3.js`

### Giảm file size
- Giới hạn: 10MB
- Có thể điều chỉnh trong `MockTestTab.js`

### Cải thiện UX
- Thêm progress bar cho quá trình convert
- Hiển thị thời gian convert
- Fallback mechanism cho webm files

## Liên hệ hỗ trợ

Nếu gặp vấn đề không thể tự khắc phục:
1. Kiểm tra logs trên Netlify
2. Chụp màn hình lỗi
3. Ghi lại các bước thực hiện
4. Liên hệ admin với thông tin chi tiết