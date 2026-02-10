/**
 * BI Management - Attendance Controller
 */

const attendanceService = require('../services/attendance.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/attendance/check-in
 */
const checkIn = asyncHandler(async (req, res) => {
    const result = await attendanceService.checkIn(req.user.id, req.body);

    if (result.error) {
        return res.status(400).json({
            success: false,
            error: result.error,
            message: result.message,
            check_in: result.check_in
        });
    }

    res.json({
        success: true,
        data: result
    });
});

/**
 * POST /api/attendance/check-out
 */
const checkOut = asyncHandler(async (req, res) => {
    const result = await attendanceService.checkOut(req.user.id, req.body);

    if (result.error) {
        return res.status(400).json({
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
 * GET /api/attendance/today
 */
const today = asyncHandler(async (req, res) => {
    const records = await attendanceService.getTodayAttendance();

    res.json({
        success: true,
        data: records
    });
});

/**
 * GET /api/attendance/my-record
 */
const myRecord = asyncHandler(async (req, res) => {
    const { from_date, to_date } = req.query;

    // Default to current month
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const records = await attendanceService.getAttendanceReport({
        user_id: req.user.id,
        from_date: from_date || defaultFrom,
        to_date: to_date || defaultTo
    });

    res.json({
        success: true,
        data: records
    });
});

/**
 * GET /api/attendance/report
 */
const report = asyncHandler(async (req, res) => {
    const { user_id, department_id, from_date, to_date, status, limit = 100 } = req.query;

    const records = await attendanceService.getAttendanceReport({
        user_id,
        department_id,
        from_date,
        to_date,
        status,
        limit: parseInt(limit)
    });

    res.json({
        success: true,
        data: records
    });
});

/**
 * POST /api/attendance/manual
 */
const manual = asyncHandler(async (req, res) => {
    const record = await attendanceService.manualAttendance(req.body, req.user.id);

    res.status(201).json({
        success: true,
        data: record
    });
});

/**
 * GET /api/attendance/stats
 */
const stats = asyncHandler(async (req, res) => {
    const { date } = req.query;

    const attendanceStats = await attendanceService.getAttendanceStats(date);

    res.json({
        success: true,
        data: attendanceStats
    });
});

/**
 * GET /api/attendance/status
 * حالة الحضور الحالية للمستخدم
 */
const status = asyncHandler(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = await attendanceService.getTodayRecordForUser(req.user.id);
    
    res.json({
        success: true,
        data: {
            date: today,
            checked_in: todayRecord?.check_in ? true : false,
            checked_out: todayRecord?.check_out ? true : false,
            check_in_time: todayRecord?.check_in || null,
            check_out_time: todayRecord?.check_out || null,
            status: todayRecord?.status || 'absent',
            today_record: todayRecord || null
        }
    });
});

module.exports = {
    checkIn,
    checkOut,
    today,
    myRecord,
    report,
    manual,
    stats,
    status
};
