// 简单的内存-based flash消息系统，替代connect-flash
// 在生产环境中，建议使用更持久的存储方案

const flashMessages = new Map();

const flash = (req, res, next) => {
  // 为每个请求生成唯一ID
  const requestId = Date.now() + Math.random().toString();

  // 设置flash消息函数
  req.flash = (type, message) => {
    if (!flashMessages.has(requestId)) {
      flashMessages.set(requestId, {});
    }
    const messages = flashMessages.get(requestId);
    if (!messages[type]) {
      messages[type] = [];
    }
    messages[type].push(message);
  };

  // 获取flash消息并设置到res.locals
  const prevRequestId = req.get('x-flash-id');
  if (prevRequestId && flashMessages.has(prevRequestId)) {
    const messages = flashMessages.get(prevRequestId);
    res.locals.success_msg = messages.success_msg ? messages.success_msg[0] : null;
    res.locals.error_msg = messages.error_msg ? messages.error_msg[0] : null;
    flashMessages.delete(prevRequestId);
  } else {
    res.locals.success_msg = null;
    res.locals.error_msg = null;
  }

  // 设置当前请求ID到响应头
  res.set('x-flash-id', requestId);

  next();
};

module.exports = flash;
