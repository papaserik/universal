const path = require('path');
const xlsx = require('./xlsx');
const yml = require('./yml');
const xml = require('./xml');

module.exports = async function importFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') return xlsx(filePath);
  if (ext === '.yml' || ext === '.yaml')  return yml(filePath);
  if (ext === '.xml')                     return xml(filePath);
  throw new Error('Неподдерживаемый формат: ' + ext);
};
