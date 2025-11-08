const crypto = require('crypto');
const https = require('https');

// OBS配置
const OBS_CONFIG = {
  endpoint: process.env.OBS_ENDPOINT,
  bucket: process.env.OBS_BUCKET,
  accessKeyId: process.env.OBS_ACCESS_KEY_ID,
  secretAccessKey: process.env.OBS_SECRET_ACCESS_KEY
};

/**
 * 生成OBS图片的完整URL
 * @param {string} fileName - 文件名
 * @returns {string} 完整的OBS URL
 */
function getObsImageUrl(fileName) {
  return `https://${OBS_CONFIG.bucket}.${OBS_CONFIG.endpoint}/${fileName}`;
}

/**
 * 将本地图片路径转换为OBS URL
 * @param {string} localPath - 本地路径，如 '/uploads/filename.jpg' 或 'filename.jpg'
 * @returns {string} OBS完整URL
 */
function convertToObsUrl(localPath) {
  if (!localPath) return null;

  // 如果已经是完整的OBS URL，直接返回
  if (localPath.startsWith('https://')) {
    return localPath;
  }

  // 移除开头的斜杠，直接使用文件名（假设图片在OBS根目录）
  let fileName = localPath.replace(/^\/+/, '').replace(/^uploads\//, '');

  return getObsImageUrl(fileName);
}

/**
 * 上传文件到OBS
 * @param {Buffer} fileBuffer - 文件缓冲区
 * @param {string} fileName - 文件名
 * @param {string} contentType - 文件类型
 * @returns {Promise<string>} 文件的OBS URL
 */
async function uploadToObs(fileBuffer, fileName, contentType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const date = new Date();
    const dateString = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = dateString.slice(0, 8);

    const host = `${OBS_CONFIG.bucket}.${OBS_CONFIG.endpoint}`;
    const canonicalUri = `/${fileName}`;
    const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${OBS_CONFIG.accessKeyId}%2F${dateStamp}%2Fcn-north-4%2Fs3%2Faws4_request&X-Amz-Date=${dateString}&X-Amz-Expires=3600&X-Amz-SignedHeaders=host%3Bx-amz-acl`;

    const canonicalHeaders = `host:${host}\nx-amz-acl:public-read\n`;
    const signedHeaders = 'host;x-amz-acl';

    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    const credentialScope = `${dateStamp}/cn-north-4/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateString}\n${credentialScope}\n${hashSha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(OBS_CONFIG.secretAccessKey, dateStamp, 'cn-north-4', 's3');
    const signature = hmacSha256(signingKey, stringToSign);
    const signatureHex = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signedUrl = `https://${host}/${fileName}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;

    // 发送PUT请求上传文件
    const url = new URL(signedUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-acl': 'public-read',
        'Content-Length': fileBuffer.length
      },
      timeout: 30000 // 30秒超时
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('DEBUG: OBS upload successful for file:', fileName);
          resolve(getObsImageUrl(fileName));
        } else {
          console.error('DEBUG: OBS upload failed with status:', res.statusCode, res.statusMessage);
          console.error('DEBUG: Response data:', responseData);
          reject(new Error(`OBS upload failed: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });

    req.on('timeout', () => {
      console.error('DEBUG: OBS upload timeout for file:', fileName);
      req.destroy();
      reject(new Error('OBS upload timeout'));
    });

    req.on('error', (error) => {
      console.error('DEBUG: OBS upload error for file:', fileName, error.message);
      reject(error);
    });

    console.log('DEBUG: Starting OBS upload for file:', fileName, 'size:', fileBuffer.length);
    req.write(fileBuffer);
    req.end();
  });
}

/**
 * 从OBS删除文件
 * @param {string} fileName - 要删除的文件名
 * @returns {Promise<void>}
 */
async function deleteFromObs(fileName) {
  return new Promise((resolve, reject) => {
    const date = new Date();
    const dateString = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = dateString.slice(0, 8);

    const host = `${OBS_CONFIG.bucket}.${OBS_CONFIG.endpoint}`;
    const canonicalUri = `/${fileName}`;
    const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${OBS_CONFIG.accessKeyId}%2F${dateStamp}%2Fcn-north-4%2Fs3%2Faws4_request&X-Amz-Date=${dateString}&X-Amz-Expires=3600&X-Amz-SignedHeaders=host`;

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = `DELETE\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    const credentialScope = `${dateStamp}/cn-north-4/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateString}\n${credentialScope}\n${hashSha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(OBS_CONFIG.secretAccessKey, dateStamp, 'cn-north-4', 's3');
    const signature = hmacSha256(signingKey, stringToSign);
    const signatureHex = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signedUrl = `https://${host}/${fileName}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;

    // 发送DELETE请求
    const url = new URL(signedUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE'
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 404) {
        resolve();
      } else {
        reject(new Error(`OBS delete failed: ${res.statusCode} ${res.statusMessage}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * 生成文件的预签名下载URL
 * @param {string} fileName - 文件名
 * @param {number} expires - 过期时间（秒）
 * @returns {string} 预签名URL
 */
function generateSignedUrl(fileName, expires = 3600) {
  const date = new Date();
  const dateString = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = dateString.slice(0, 8);

  const host = `${OBS_CONFIG.bucket}.${OBS_CONFIG.endpoint}`;
  const canonicalUri = `/${fileName}`;
  const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${OBS_CONFIG.accessKeyId}%2F${dateStamp}%2Fcn-north-4%2Fs3%2Faws4_request&X-Amz-Date=${dateString}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=host`;

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

  const credentialScope = `${dateStamp}/cn-north-4/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateString}\n${credentialScope}\n${hashSha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(OBS_CONFIG.secretAccessKey, dateStamp, 'cn-north-4', 's3');
  const signature = hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `https://${host}/${fileName}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;
}

// 辅助函数
function hashSha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

function hmacSha256(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmacSha256('AWS4' + key, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, 'aws4_request');
}

module.exports = {
  getObsImageUrl,
  convertToObsUrl,
  uploadToObs,
  deleteFromObs,
  generateSignedUrl
};
