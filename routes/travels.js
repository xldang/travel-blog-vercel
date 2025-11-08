const express = require('express');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth');
const { uploadToObs, convertToObsUrl } = require('../utils/obs');

const prisma = new PrismaClient();

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

router.get('/travels', async (req, res) => {
  try {
    const travels = await prisma.travel.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换图片URL为OBS URL
    travels.forEach(travel => {
      if (travel.coverImage) {
        travel.coverImage = convertToObsUrl(travel.coverImage);
      }
    });

    res.render('travels/index', { travels });
  } catch (error) {
    console.error('获取游记列表失败:', error);
    req.flash('error_msg', '获取游记列表失败');
    res.redirect('/');
  }
});

router.get('/travels/new', isAdmin, (req, res) => {
  res.render('travels/new');
});

router.post('/travels', isAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, description, startLocation, endLocation, transportMethod, totalCost, startDate, endDate } = req.body;

    let coverImageUrl = null;

    // 如果有上传文件，上传到OBS
    if (req.file) {
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      coverImageUrl = await uploadToObs(fileBuffer, req.file.filename, req.file.mimetype);

      // 删除本地临时文件
      fs.unlinkSync(req.file.path);
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

    await prisma.travel.create({
      data: travelData
    });

    req.flash('success_msg', '游记创建成功');
    res.redirect('/travels');
  } catch (error) {
    console.error('创建游记失败:', error);
    req.flash('error_msg', '创建游记失败');
    res.redirect('/travels/new');
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
      req.flash('error_msg', '游记不存在');
      return res.redirect('/travels');
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
      });
    }

    res.render('travels/show', { travel });
  } catch (error) {
    console.error('获取游记详情失败:', error);
    req.flash('error_msg', '获取游记详情失败: ' + error.message);
    res.redirect('/travels');
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
      req.flash('error_msg', '游记不存在');
      return res.redirect('/travels');
    }

    // 转换图片URL为OBS URL用于显示
    if (travel.coverImage) {
      travel.coverImage = convertToObsUrl(travel.coverImage);
    }

    res.render('travels/edit', { travel });
  } catch (error) {
    console.error('获取游记失败:', error);
    req.flash('error_msg', '获取游记失败: ' + error.message);
    res.redirect('/travels');
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
      req.flash('error_msg', '游记不存在');
      return res.redirect('/travels');
    }

    let coverImageUrl = existingTravel.coverImage;

    // 如果有新上传文件，上传到OBS
    if (req.file) {
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      coverImageUrl = await uploadToObs(fileBuffer, req.file.filename, req.file.mimetype);

      // 删除本地临时文件
      fs.unlinkSync(req.file.path);
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

    req.flash('success_msg', '游记更新成功');
    res.redirect(`/travels/${req.params.id}`);
  } catch (error) {
    console.error('更新游记失败:', error);
    req.flash('error_msg', '更新游记失败: ' + error.message);
    res.redirect(`/travels/${req.params.id}/edit`);
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
      req.flash('error_msg', '游记不存在');
      return res.redirect('/travels');
    }

    // 删除相关的行程（级联删除会自动处理）
    await prisma.travel.delete({
      where: { id: travelId }
    });

    req.flash('success_msg', '游记删除成功');
    res.redirect('/travels');
  } catch (error) {
    console.error('删除游记失败:', error);
    req.flash('error_msg', '删除游记失败');
    res.redirect('/travels');
  }
});

module.exports = router;
