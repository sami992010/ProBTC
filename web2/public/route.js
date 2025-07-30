// Admin routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Authentication middleware
const { ensureAdminAuthenticated } = require('../middleware/auth');

// Login routes
router.get('/admin/login', adminController.showLogin);
router.post('/admin/login', adminController.handleLogin);

// Protected admin routes
router.get('/admin/dashboard', ensureAdminAuthenticated, adminController.showDashboard);
router.get('/admin/users', ensureAdminAuthenticated, adminController.showUsers);
// Add other admin routes...

module.exports = router;