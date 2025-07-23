const fs = require('fs');
const path = '/tmp/visitor_count.json';

exports.handler = async function(event, context) {
  let count = 0;
  let total = 0;
  try {
    // Đọc file lưu số lượng truy cập
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      count = data.count || 0;
      total = data.total || 0;
    }
    // Nếu là truy cập mới (GET), tăng số lượng
    if (event.httpMethod === 'GET') {
      count++;
      total++;
      fs.writeFileSync(path, JSON.stringify({ count, total }));
    }
    // Nếu là reset (POST), chỉ đặt lại count về 0, giữ nguyên total
    if (event.httpMethod === 'POST') {
      count = 0;
      // total giữ nguyên, không reset
      fs.writeFileSync(path, JSON.stringify({ count, total }));
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
