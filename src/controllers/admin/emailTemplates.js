const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const items = await prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
  res.render('admin/email-templates/list', { items });
};

exports.form = async (req, res) => {
  const item = await prisma.emailTemplate.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.redirect('/admin/email-templates');
  res.render('admin/email-templates/form', { item, saved: req.query.saved === '1' });
};

exports.save = async (req, res) => {
  await prisma.emailTemplate.update({
    where: { id: Number(req.params.id) },
    data: { subject: req.body.subject || '', body: req.body.body || '', active: req.body.active === 'on' }
  });
  res.redirect('/admin/email-templates/' + req.params.id + '?saved=1');
};

exports.reset = async (req, res) => {
  const preset = require('../../services/emailTemplates/preset.js');
  const item = await prisma.emailTemplate.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.redirect('/admin/email-templates');
  const original = preset.templates.find(t => t.key === item.key);
  if (original) {
    await prisma.emailTemplate.update({ where: { id: item.id }, data: { subject: original.subject, body: original.body } });
  }
  res.redirect('/admin/email-templates/' + item.id + '?saved=1');
};
