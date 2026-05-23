import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: "Token missing" });

        const token = authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: "Token missing" });

        try {
            const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            req.user = decode;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired" });
            } else {
                return res.status(401).json({ message: "Invalid token" });
            }
        }
    } catch (error) {
        return res.status(500).json({ message: 'ServerError' });
    }
}


const authorizeRole = (allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole) {
            return res.status(403).json({ message: "Unauthorized: Role missing" });
        }
        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: "Unauthorized: Insufficient permissions" });
        }
        return next();
    }
}

const ensureOwnership = (paramName = 'id') => {
    return (req, res, next) => {
        const userId = req.user?.id;
        const paramId = req.params[paramName];
        
        if (!userId || (String(userId) !== String(paramId))) {
            const adminRoles = ['admin', 'super_admin', 'main super admin', 'main_super_admin'];
            if (req.user?.role && adminRoles.includes(req.user.role)) {
                return next();
            }
            return res.status(403).json({ message: "Forbidden: You do not own this resource." });
        }
        next();
    }
}

export { authenticateUser, authorizeRole, ensureOwnership }
