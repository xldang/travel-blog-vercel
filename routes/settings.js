const express = require('express');
const { Setting } = require('../models');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// Settings page
router.get('/settings', isAdmin, async (req, res) => {
    try {
        const titleSetting = await Setting.findByPk('websiteTitle');
        const websiteTitle = titleSetting ? titleSetting.value : "DZ's Travel Story";
        res.render('settings/index', {
            websiteTitle,
            user: {
                username: req.session.username,
                role: req.session.role
            }
        });
    } catch (error) {
        console.error('Error getting settings:', error);
        req.flash('error_msg', '加载设置页面失败');
        res.redirect('/travels');
    }
});

// Update settings
router.post('/settings', isAdmin, async (req, res) => {
    try {
        const { websiteTitle } = req.body;
        await Setting.upsert({ key: 'websiteTitle', value: websiteTitle });

        // Update the title in app.locals so it's reflected immediately
        req.app.locals.websiteTitle = websiteTitle;

        req.flash('success_msg', '网站设置已更新');
        res.redirect('/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        req.flash('error_msg', '更新设置失败');
        res.redirect('/settings');
    }
});

module.exports = router;
