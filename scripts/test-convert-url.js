require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { convertToObsUrl } = require('../utils/obs');

console.log('测试convertToObsUrl函数:');

// 测试不同的输入
const testCases = [
  '1754737899640-240149778.jpg',  // 只有文件名
  '/uploads/1754737899640-240149778.jpg',  // 带/uploads/前缀
  'https://travel-blog.obs.cn-north-4.myhuaweicloud.com/1754737899640-240149778.jpg',  // 已经是OBS URL
  null,
  undefined,
  ''
];

testCases.forEach((input, index) => {
  const result = convertToObsUrl(input);
  console.log(`${index + 1}. 输入: ${input}`);
  console.log(`   输出: ${result}`);
  console.log('');
});
