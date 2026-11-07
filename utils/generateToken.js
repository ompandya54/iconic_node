import jwt from 'jsonwebtoken';

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'iconic_secret_jwt_key', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

export default generateToken;
export { generateToken };
