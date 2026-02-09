/**
 * BI Management - Auth Controller
 */

const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password, req.ip);

    if (result.error) {
        return res.status(401).json({
            success: false,
            error: result.error,
            message: result.message,
            locked_until: result.locked_until
        });
    }

    res.json({
        success: true,
        data: result
    });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    const result = authService.logout(req.user.id, req.token, req.ip);

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_TOKEN',
            message: 'Refresh token is required'
        });
    }

    const result = authService.refreshToken(refresh_token);

    if (result.error) {
        return res.status(401).json({
            success: false,
            error: result.error,
            message: result.message
        });
    }

    res.json({
        success: true,
        data: result
    });
});

/**
 * POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    const result = await authService.changePassword(
        req.user.id, 
        current_password, 
        new_password,
        req.ip
    );

    if (result.error) {
        return res.status(400).json({
            success: false,
            error: result.error,
            message: result.message
        });
    }

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

/**
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

module.exports = {
    login,
    logout,
    refreshToken,
    changePassword,
    me
};
