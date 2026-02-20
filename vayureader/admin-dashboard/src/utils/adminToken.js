import { ADMIN_PERMISSIONS } from '../constants/adminPermissions';

export const ADMIN_TOKEN_KEY = 'admin_token';

const decodeBase64Url = (value) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return atob(base64 + padding);
};

export const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    try {
        return JSON.parse(decodeBase64Url(parts[1]));
    } catch {
        return null;
    }
};

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

export const setAdminToken = (token) => {
    if (token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
};

export const clearAdminToken = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const getPermissionsFromToken = (token) => {
    const payload = decodeJwtPayload(token);
    const rawPermissions = Array.isArray(payload?.permissions) ? payload.permissions : [];

    const validPermissions = rawPermissions.filter((permission) =>
        ADMIN_PERMISSIONS.includes(permission)
    );

    return [...new Set(validPermissions)];
};
