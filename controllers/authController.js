const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  sendSuccess(res, { statusCode: 201, message: 'User registered successfully', data: user });
});

const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  sendSuccess(res, {
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { accessToken } = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, { message: 'Token refreshed successfully', data: { accessToken } });
});

const logout = catchAsync(async (req, res) => {
  const expiresAt = new Date(req.user.exp * 1000);
  await authService.logout({ jti: req.user.jti, userId: req.user.id, expiresAt });
  sendSuccess(res, { message: 'Logged out successfully' });
});

const me = catchAsync(async (req, res) => {
  const user = await authService.findUserById(req.user.id);
  sendSuccess(res, { message: 'Profile retrieved successfully', data: user });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { message: 'Profile updated successfully', data: user });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  sendSuccess(res, { message: 'Password changed successfully' });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  me,
  updateProfile,
  changePassword,
};
