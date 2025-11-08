const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

const router = express.Router();

// Settings page
router.get('/settings', isAdmin, async (req, res) => {
    try {
        const titleSetting = await prisma.setting.findUnique({
            where: { key: 'websiteTitle' }
        });
        const websiteTitle = titleSetting ? titleSetting.value : "DZ's Travel Story";
        res.render('settings/index', {
            websiteTitle,
            user: req.user,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error getting settings:', error);
        res.redirect('/travels?error=' + encodeURIComponent('加载设置页面失败'));
    }
});

// Update settings
router.post('/settings', isAdmin, async (req, res) => {
    try {
        const { websiteTitle } = req.body;
        await prisma.setting.upsert({
            where: { key: 'websiteTitle' },
            update: { value: websiteTitle },
            create: { key: 'websiteTitle', value: websiteTitle }
        });

        // Update the title in app.locals so it's reflected immediately
        req.app.locals.websiteTitle = websiteTitle;

        res.redirect('/settings?success=' + encodeURIComponent('网站设置已更新'));
    } catch (error) {
        console.error('Error updating settings:', error);
        res.redirect('/settings?error=' + encodeURIComponent('更新设置失败'));
    }
});

module.exports = router;
