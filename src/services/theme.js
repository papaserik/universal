const fs = require('fs');
const path = require('path');
const { getSetting } = require('./settings');
const THEMES_DIR = path.join(__dirname, '..', 'themes');
const BASE_VIEWS = path.join(__dirname, '..', 'views');
async function loadTheme() {
  const name = await getSetting('active_theme', 'default');
  const dir = path.join(THEMES_DIR, name);
  return fs.existsSync(dir) ? name : 'default';
}
function viewPaths(theme) {
  return [path.join(THEMES_DIR, theme, 'views'), BASE_VIEWS];
}
function listThemes() {
  return fs.readdirSync(THEMES_DIR).filter(f => fs.statSync(path.join(THEMES_DIR, f)).isDirectory());
}
module.exports = { loadTheme, viewPaths, listThemes };
