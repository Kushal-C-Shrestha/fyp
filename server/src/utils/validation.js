export const isValidEmail = (email) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
};

export const isValidPassword = (password) => {
    if (!password) return false;
    // 8-20 chars, at least 1 upper, 1 lower, 1 number, 1 special char
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{}|;:'",.<>/?]).{8,20}$/;
    return re.test(password);
};


export const isNonEmptyString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};

export const isValidPhone = (phone) => {
    if (!phone) return false;
    // Simple 10-digit number check
    const re = /^\d{10}$/;
    return re.test(phone);
};