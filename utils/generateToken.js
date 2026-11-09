import jwt from 'jsonwebtoken';

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'iconic_secret_jwt_key_2026', {
    expiresIn: process.env.JWT_EXPIRE || '7d', // 1 week expiration
  });
};

export default generateToken;
export { generateToken };
