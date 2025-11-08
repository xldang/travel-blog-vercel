const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { uploadToObs } = require('../utils/obs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function reuploadImages() {
  try {
    // 读取uploads目录中的所有文件
    const files = fs.readdirSync(UPLOADS_DIR).filter(file => {
      // 只处理图片文件
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`找到 ${files.length} 个图片文件需要重新上传`);

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const filePath = path.join(UPLOADS_DIR, fileName);

      try {
        console.log(`[${i + 1}/${files.length}] 正在重新上传: ${fileName}`);

        // 读取文件内容
        const fileBuffer = fs.readFileSync(filePath);

        // 获取文件类型
        const ext = path.extname(fileName).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';

        // 重新上传到OBS，设置ACL为public-read
        const obsUrl = await uploadToObs(fileBuffer, fileName, contentType);

        console.log(`✓ 成功重新上传: ${fileName} -> ${obsUrl}`);

        // 添加小延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`✗ 上传失败: ${fileName}`, error.message);
      }
    }

    console.log('所有图片重新上传完成！');

  } catch (error) {
    console.error('脚本执行出错:', error);
  }
}

// 运行脚本
reuploadImages();
