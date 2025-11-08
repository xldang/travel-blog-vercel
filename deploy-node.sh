#!/bin/bash

# 旅游游记博客 - Node.js版本部署脚本
# fallincloud.com专用部署脚本

set -e

echo "=========================================="
echo "开始部署旅游游记博客 Node.js版本"
echo "域名：fallincloud.com"
echo "端口：5001"
echo "=========================================="

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
   echo "错误：请使用sudo运行此脚本" 
   exit 1
fi

# 设置变量
PROJECT_DIR="/var/www/travel-blog-node"
NODE_USER="www-data"
NODE_PORT="5001"
PM2_NAME="travel-blog-node"
DB_FILE="travel_blog_node.db"

# 创建项目目录
echo "创建项目目录..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/uploads

# 移动项目文件
echo "部署项目文件..."
if [ -d "/tmp/travel-blog-node" ]; then
    cp -r /tmp/travel-blog-node/* $PROJECT_DIR/
    # 不再删除源文件夹，便于调试和重新部署
    # rm -rf /tmp/travel-blog-node
else
    echo "错误：找不到/tmp/travel-blog-node目录"
    exit 1
fi

# 设置权限
echo "设置文件权限..."
chown -R $NODE_USER:$NODE_USER $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 775 $PROJECT_DIR/uploads

# 安装Node.js依赖
echo "安装Node.js依赖..."
cd $PROJECT_DIR

# 创建npm缓存目录并设置权限
mkdir -p /var/www/.npm
chown -R $NODE_USER:$NODE_USER /var/www/.npm

# 使用sudo -u安装依赖
sudo -u $NODE_USER npm install --omit=dev

# 初始化数据库和创建管理员账户
echo "初始化数据库..."
sudo -u $NODE_USER node -e "
const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    try {
        // 同步数据库结构
        await sequelize.sync({ force: false });
        console.log('数据库结构已同步');
        
        // 检查并创建管理员账户
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        if (adminUser) {
            console.log('管理员账户已存在，检查密码...');
            const isValid = await bcrypt.compare('admin123', adminUser.password);
            if (!isValid) {
                console.log('重置管理员密码...');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await adminUser.update({ password: hashedPassword });
                console.log('管理员密码已重置为: admin123');
            } else {
                console.log('管理员密码正确');
            }
        } else {
            console.log('创建默认管理员账户...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                email: 'admin@fallincloud.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('默认管理员账户已创建: admin/admin123');
        }
        
        // 验证用户表
        const userCount = await User.count();
        console.log('总用户数:', userCount);
        
        process.exit(0);
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

initDatabase();
"

# 设置数据库文件权限
if [ -f "$DB_FILE" ]; then
    chmod 664 $PROJECT_DIR/$DB_FILE
    chown $NODE_USER:$NODE_USER $PROJECT_DIR/$DB_FILE
fi

# 安装PM2
echo "安装PM2进程管理器..."
npm install -g pm2

# 创建PM2目录并设置权限
mkdir -p /var/www/.pm2/{logs,pids,modules}
chown -R $NODE_USER:$NODE_USER /var/www/.pm2

# 初始化PM2配置
sudo -u $NODE_USER pm2 update

# 创建PM2启动脚本
echo "创建PM2启动脚本..."
sudo -u $NODE_USER cat > $PROJECT_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$PM2_NAME',
    script: './app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $NODE_PORT
    }
  }]
};
EOF

# 创建Nginx配置
echo "配置Nginx..."
cat > /etc/nginx/sites-available/fallincloud-node <<EOF
server {
    listen 80;
    server_name fallincloud.com www.fallincloud.com;

    location / {
        proxy_pass http://localhost:$NODE_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static/ {
        alias $PROJECT_DIR/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# 启用Nginx站点
if [ ! -L /etc/nginx/sites-enabled/fallincloud-node ]; then
    ln -s /etc/nginx/sites-available/fallincloud-node /etc/nginx/sites-enabled/
fi

# 测试Nginx配置并重新加载
echo "测试Nginx配置..."
nginx -t
systemctl reload nginx

# 配置SSL证书（如果certbot可用）
if command -v certbot &> /dev/null; then
    echo "配置SSL证书..."
    certbot --nginx -d fallincloud.com -d www.fallincloud.com --agree-tos --non-interactive --email admin@fallincloud.com
    systemctl reload nginx
    echo "SSL证书配置完成！"
else
    echo "警告：未检测到certbot，跳过SSL证书配置"
    echo "安装certbot后运行：certbot --nginx -d fallincloud.com"
fi

# 启动应用
echo "启动Node.js应用..."
sudo -u $NODE_USER pm2 start ecosystem.config.js
sudo -u $NODE_USER pm2 save

# 设置PM2开机启动
sudo -u $NODE_USER env PATH=$PATH:/usr/bin pm2 startup systemd -u $NODE_USER --hp /var/www

# 创建系统管理命令
echo "创建系统管理命令..."
cat > /usr/local/bin/travel-node-start <<EOF
#!/bin/bash
sudo -u $NODE_USER pm2 start $PROJECT_DIR/ecosystem.config.js
EOF

cat > /usr/local/bin/travel-node-stop <<EOF
#!/bin/bash
sudo -u $NODE_USER pm2 stop $PM2_NAME
EOF

cat > /usr/local/bin/travel-node-restart <<EOF
#!/bin/bash
sudo -u $NODE_USER pm2 restart $PM2_NAME
EOF

cat > /usr/local/bin/travel-node-status <<EOF
#!/bin/bash
echo "Node.js版本状态："
sudo -u $NODE_USER pm2 status $PM2_NAME
echo ""
echo "端口监听状态："
sudo netstat -tlnp | grep :$NODE_PORT
EOF

cat > /usr/local/bin/travel-node-backup <<EOF
#!/bin/bash
BACKUP_DIR="/var/backups/travel-blog-node"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp $PROJECT_DIR/$DB_FILE $BACKUP_DIR/${DB_FILE}_$DATE
echo "数据库备份完成：$BACKUP_DIR/${DB_FILE}_$DATE"
EOF

# 设置管理命令权限
chmod +x /usr/local/bin/travel-node-*

# 创建管理员初始化脚本
echo "创建管理员初始化脚本..."
cat > /usr/local/bin/travel-node-init-admin <<EOF
#!/bin/bash
# 初始化管理员账户脚本
PROJECT_DIR="/var/www/travel-blog-node"
NODE_USER="www-data"

cd $PROJECT_DIR
sudo -u $NODE_USER node -e "
const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function initAdmin() {
    try {
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (adminExists) {
            console.log('管理员账户已存在');
            return;
        }
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            username: 'admin',
            email: 'admin@fallincloud.com',
            password: hashedPassword,
            role: 'admin'
        });
        console.log('管理员账户已创建: admin/admin123');
    } catch (error) {
        console.error('创建管理员账户失败:', error);
    }
}

initAdmin();
"
EOF
chmod +x /usr/local/bin/travel-node-init-admin

# 创建日志目录
mkdir -p /var/log/travel-blog-node
chown $NODE_USER:$NODE_USER /var/log/travel-blog-node

# 创建systemd服务（备用）
cat > /etc/systemd/system/travel-blog-node.service <<EOF
[Unit]
Description=Travel Blog Node.js Application
After=network.target

[Service]
Type=forking
User=$NODE_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 重新加载systemd
systemctl daemon-reload
systemctl enable travel-blog-node

# 检查服务状态
echo "检查服务状态..."
sleep 5
sudo -u $NODE_USER pm2 status

# 检查端口
echo "检查端口监听..."
netstat -tlnp | grep :$NODE_PORT

echo "=========================================="
echo "部署完成！"
echo "访问地址：http://fallincloud.com"
echo ""
echo "管理员登录信息："
echo "  用户名：admin"
echo "  密码：admin123"
echo "  登录地址：http://fallincloud.com/login"
echo ""
echo "管理命令："
echo "  travel-node-start        - 启动服务"
echo "  travel-node-stop         - 停止服务"
echo "  travel-node-restart      - 重启服务"
echo "  travel-node-status       - 查看状态"
echo "  travel-node-backup       - 备份数据"
echo "  travel-node-init-admin   - 重新初始化管理员账户"
echo "=========================================="