const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: { message: 'No token provided' } });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true, active: true }
        });

        if (!user || !user.active) {
            return res.status(401).json({ error: { message: 'User not found or inactive' } });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: { message: 'Invalid token' } });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: { message: 'Insufficient permissions' } });
        }
        next();
    };
};

module.exports = { authMiddleware, requireRole };
