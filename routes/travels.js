const express = require('express');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth');
const { uploadToObs, convertToObsUrl } = require('../utils/obs');

const prisma = new PrismaClient();

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

router.get('/travels', async (req, res) => {
  console.log('DEBUG: Accessing /travels route');
  console.log('DEBUG: Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('DEBUG: Environment variables check:');
  console.log('  - DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('  - SESSION_SECRET exists:', !!process.env.SESSION_SECRET);

  try {
    console.log('DEBUG: Attempting to connect to database...');
    await prisma.$connect();
    console.log('DEBUG: Database connection successful');

    console.log('DEBUG: Querying travels...');
    const travels = await prisma.travel.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log(`DEBUG: Found ${travels.length} travels`);

    // 转换图片URL为OBS URL
    travels.forEach(travel => {
      if (travel.coverImage) {
        const originalUrl = travel.coverImage;
        travel.coverImage = convertToObsUrl(travel.coverImage);
        console.log(`DEBUG: Converted image URL: ${originalUrl} -> ${travel.coverImage}`);
      }
    });

    console.log('DEBUG: Rendering travels/index template');
    res.render('travels/index', {
      travels,
      success: req.query.success,
      error: req.query.error
    });
    console.log('DEBUG: Template rendered successfully');
  } catch (error) {
    console.error('ERROR: 获取游记列表失败:', error);
    console.error('ERROR: Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    // 避免重定向循环，直接渲染空列表
    console.log('DEBUG: Rendering empty travels list due to error');
    res.render('travels/index', { travels: [] });
  }
});

router.get('/travels/new', isAdmin, (req, res) => {
  res.render('travels/new', {
    success: req.query.success,
    error: req.query.error
  });
});

router.post('/travels', isAdmin, upload.single('coverImage'), async (req, res) => {
  const startTime = Date.now();
  console.log('DEBUG: POST /travels - Start processing');
  console.log('DEBUG: Admin user:', {
    userId: req.user?.id,
    username: req.user?.username,
    role: req.user?.role
  });
  console.log('DEBUG: Request body:', req.body);
  console.log('DEBUG: File uploaded:', !!req.file);

  try {
    const { title, description, startLocation, endLocation, transportMethod, totalCost, startDate, endDate } = req.body;

    // 验证必填字段
    if (!title || !title.trim()) {
      console.log('DEBUG: Validation failed - title is required');
      return res.redirect('/travels/new?error=' + encodeURIComponent('标题不能为空'));
    }

    let coverImageUrl = null;

    // 如果有上传文件，上传到OBS
    if (req.file) {
      console.log('DEBUG: Starting OBS upload...');
      const uploadStartTime = Date.now();
      try {
        const fileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
        console.log('DEBUG: File details:', {
          originalName: req.file.originalname,
          fileName: fileName,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        coverImageUrl = await uploadToObs(req.file.buffer, fileName, req.file.mimetype);
        const uploadEndTime = Date.now();
        console.log('DEBUG: OBS upload completed in', uploadEndTime - uploadStartTime, 'ms');
        console.log('DEBUG: OBS URL:', coverImageUrl);
      } catch (uploadError) {
        console.error('DEBUG: OBS upload failed:', uploadError);
        return res.redirect('/travels/new?error=' + encodeURIComponent('图片上传失败：' + uploadError.message));
      }
    }

    console.log('DEBUG: Preparing travel data...');
    const travelData = {
      title: title.trim(),
      description: description?.trim() || null,
      startLocation: startLocation?.trim() || null,
      endLocation: endLocation?.trim() || null,
      transportMethod: transportMethod?.trim() || null,
      totalCost: totalCost ? parseFloat(totalCost) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImageUrl
    };

    console.log('DEBUG: Travel data prepared:', travelData);
    console.log('DEBUG: Creating travel record in database...');

    const dbStartTime = Date.now();
    const result = await prisma.travel.create({
      data: travelData
    });
    const dbEndTime = Date.now();

    console.log('DEBUG: Database operation completed in', dbEndTime - dbStartTime, 'ms');
    console.log('DEBUG: Created travel with ID:', result.id);

    const endTime = Date.now();
    console.log('DEBUG: Total processing time:', endTime - startTime, 'ms');

    res.redirect('/travels?success=' + encodeURIComponent('游记创建成功'));
  } catch (error) {
    const endTime = Date.now();
    console.error('ERROR: 创建游记失败 after', endTime - startTime, 'ms');
    console.error('ERROR: Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack?.substring(0, 500) // 限制堆栈跟踪长度
    });

    // 根据错误类型提供更具体的错误信息
    let errorMessage = '创建游记失败';
    if (error.code === 'P2002') {
      errorMessage = '数据重复，请检查输入';
    } else if (error.code === 'P1001') {
      errorMessage = '数据库连接失败';
    } else if (error.message.includes('timeout')) {
      errorMessage = '操作超时，请重试';
    }

    res.redirect('/travels/new?error=' + encodeURIComponent(errorMessage + '：' + error.message));
  }
});

router.get('/travels/:id', async (req, res) => {
  try {
    const travel = await prisma.travel.findUnique({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        itineraries: true
      }
    });

    if (!travel) {
      return res.redirect('/travels?error=' + encodeURIComponent('游记不存在'));
    }

    // 转换图片URL为OBS URL
    if (travel.coverImage) {
      travel.coverImage = convertToObsUrl(travel.coverImage);
    }

    // 按行程出发时间由早到晚排序（升序）
    if (travel.itineraries) {
      travel.itineraries.sort((a, b) => {
        // 创建完整的日期时间对象进行比较
        const createDateTime = (date, time) => {
          const d = new Date(date);
          const [hours, minutes] = (time || '00:00').split(':');
          d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return d;
        };

        const datetimeA = createDateTime(a.travelDate, a.startTime);
        const datetimeB = createDateTime(b.travelDate, b.startTime);

        // 由早到晚排序（升序）
        return datetimeA - datetimeB;
      });

      // 转换行程中的图片URL
      travel.itineraries.forEach(itinerary => {
        if (itinerary.images) {
          try {
            const images = JSON.parse(itinerary.images);
            const convertedImages = images.map(img => convertToObsUrl(img));
            itinerary.images = JSON.stringify(convertedImages);
          } catch (e) {
            // 如果解析失败，保持原样
          }
        }

        // 转换content字段中的图片URL
        if (itinerary.content) {
          itinerary.content = itinerary.content.replace(
            /<img([^>]+)src=["']([^"']+)["']/gi,
            (match, attrs, src) => {
              const convertedSrc = convertToObsUrl(src);
              return `<img${attrs}src="${convertedSrc}"`;
            }
          );
        }
      });
    }

    res.render('travels/show', {
      travel,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('获取游记详情失败:', error);
    res.redirect('/travels?error=' + encodeURIComponent('获取游记详情失败'));
  }
});

router.get('/travels/:id/edit', isAdmin, async (req, res) => {
  try {
    const travel = await prisma.travel.findUnique({
      where: {
        id: parseInt(req.params.id)
      }
    });

    if (!travel) {
      return res.redirect('/travels?error=' + encodeURIComponent('游记不存在'));
    }

    // 转换图片URL为OBS URL用于显示
    if (travel.coverImage) {
      travel.coverImage = convertToObsUrl(travel.coverImage);
    }

    res.render('travels/edit', {
      travel,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('获取游记失败:', error);
    res.redirect('/travels?error=' + encodeURIComponent('获取游记失败'));
  }
});

router.put('/travels/:id', isAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, startLocation, endLocation, transportMethod, totalCost, startDate, endDate } = req.body;

    const travelId = parseInt(req.params.id);
    const existingTravel = await prisma.travel.findUnique({
      where: { id: travelId }
    });

    if (!existingTravel) {
      return res.redirect('/travels?error=' + encodeURIComponent('游记不存在'));
    }

    let coverImageUrl = existingTravel.coverImage;

    // 如果有新上传文件，上传到OBS
    if (req.file) {
      const fileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
      coverImageUrl = await uploadToObs(req.file.buffer, fileName, req.file.mimetype);
    }

    const travelData = {
      title,
      description,
      startLocation,
      endLocation,
      transportMethod,
      totalCost: totalCost ? parseFloat(totalCost) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      coverImage: coverImageUrl
    };

    await prisma.travel.update({
      where: { id: travelId },
      data: travelData
    });

    res.redirect(`/travels/${req.params.id}?success=` + encodeURIComponent('游记更新成功'));
  } catch (error) {
    console.error('更新游记失败:', error);
    res.redirect(`/travels/${req.params.id}/edit?error=` + encodeURIComponent('更新游记失败'));
  }
});

router.delete('/travels/:id', isAdmin, async (req, res) => {
  try {
    const travelId = parseInt(req.params.id);
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: { itineraries: true }
    });

    if (!travel) {
      return res.redirect('/travels?error=' + encodeURIComponent('游记不存在'));
    }

    // 删除相关的行程（级联删除会自动处理）
    await prisma.travel.delete({
      where: { id: travelId }
    });

    res.redirect('/travels?success=' + encodeURIComponent('游记删除成功'));
  } catch (error) {
    console.error('删除游记失败:', error);
    res.redirect('/travels?error=' + encodeURIComponent('删除游记失败'));
  }
});

module.exports = router;
