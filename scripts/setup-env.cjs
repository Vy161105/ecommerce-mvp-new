const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const target = path.join(root, '.env');
if (fs.existsSync(target)) {
  console.log('Đã có .env: giữ nguyên cấu hình và mật khẩu hiện tại.');
} else {
  fs.copyFileSync(path.join(root, '.env.example'), target, fs.constants.COPYFILE_EXCL);
  console.log('Đã tạo .env từ .env.example cho bài demo local.');
}
