const fs = require('fs');
const path = '/tmp/visitor_count.json';

exports.handler = async function(event, context) {
  let count = 0;
  let total = 0;
  let uniqueDevices = [];
  try {
    // Đọc file lưu số lượng truy cập và danh sách thiết bị
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      count = data.count || 0;
      total = data.total || 0;
      uniqueDevices = data.uniqueDevices || [];
    }
    // Lấy deviceId từ cookie header (Netlify Functions không có localStorage, nên dùng cookie hoặc query param)
    let deviceId = null;
    if (event.headers && event.headers.cookie) {
      const match = event.headers.cookie.match(/visitor_id=([a-zA-Z0-9_-]+)/);
      if (match) deviceId = match[1];
    }
    // Nếu chưa có deviceId, tạo mới (trả về cho client set cookie)
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    }
    let isNewDevice = !uniqueDevices.includes(deviceId);
    // Nếu là truy cập mới (GET)
    if (event.httpMethod === 'GET') {
      count++;
      if (isNewDevice) {
        total++;
        uniqueDevices.push(deviceId);
      }
      fs.writeFileSync(path, JSON.stringify({ count, total, uniqueDevices }));
      // Trả về deviceId để client set cookie nếu chưa có
      return {
        statusCode: 200,
        headers: {
          'Set-Cookie': `visitor_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax` // 1 năm
        },
        body: JSON.stringify({ visitorCount: count, totalVisitorCount: total, deviceId })
      };
    }
    // Nếu là reset (POST), chỉ đặt lại count về 0, giữ nguyên total và uniqueDevices
    if (event.httpMethod === 'POST') {
      count = 0;
      fs.writeFileSync(path, JSON.stringify({ count, total, uniqueDevices }));
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ visitorCount: count, totalVisitorCount: total })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
