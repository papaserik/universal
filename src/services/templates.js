const { prisma } = require('../config/db');

function render(template, vars) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, key) {
    var parts = key.split('.');
    var v = vars;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return '';
      v = v[parts[i]];
    }
    return v == null ? '' : String(v);
  });
}

async function getTemplate(key) {
  return prisma.emailTemplate.findUnique({ where: { key: key } });
}

async function renderTemplate(key, vars) {
  var tpl = await getTemplate(key);
  if (!tpl || !tpl.active) return null;
  return {
    subject: render(tpl.subject, vars),
    html: render(tpl.body, vars)
  };
}

async function getStatusByCode(code) {
  return prisma.orderStatus.findUnique({ where: { code: code } });
}

async function renderStatusEmail(status, vars) {
  if (!status || !status.notifyClient || !status.emailSubject) return null;
  return {
    subject: render(status.emailSubject, vars),
    html: render(status.emailBody || '', vars)
  };
}

module.exports = { render, getTemplate, renderTemplate, getStatusByCode, renderStatusEmail };
