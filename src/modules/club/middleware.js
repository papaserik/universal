const referral = require('./service');

// Обрабатывает GET /r/:code — сохраняет cookie, редиректит на главную
exports.capture = async (req, res) => {
  const code = (req.params.code || '').toUpperCase();

  if (code) {
    const inviter = await referral.findByCode(code);
    if (inviter) {
      // Не позволяем юзеру пригласить сам себя
      const currentUser = req.session.user;
      if (!currentUser || currentUser.id !== inviter.id) {
        // Сохраняем на N дней
        const days = 30;
        res.cookie('ref', code, {
          maxAge: days * 24 * 60 * 60 * 1000,
          httpOnly: false,
          sameSite: 'lax'
        });
      }
    }
  }

  res.redirect('/');
};
