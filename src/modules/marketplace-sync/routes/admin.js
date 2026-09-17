const router = require('express').Router();
const { imageUpload, importUpload, processUploaded } = require('../../../services/upload');

const integrationsAdmin     = require('../controller-admin/integrations');
const integrationsImportCtrl= require('../controller-admin/integrationsImport');
const syncOrdersCtrl        = require('../controller-admin/syncOrders');
const marketplaces          = require('../controller-admin/marketplaces');

router.get('/marketplaces', marketplaces.list);
router.get('/marketplaces/new', marketplaces.form);
router.get('/marketplaces/:id', marketplaces.form);
router.post('/marketplaces', marketplaces.save);
router.post('/marketplaces/:id', marketplaces.save);
router.post('/marketplaces/:id/toggle', marketplaces.toggle);
router.post('/marketplaces/:id/delete', marketplaces.remove);
router.post('/marketplaces/upload-icon', imageUpload.single('files'), processUploaded, marketplaces.uploadIcon);

router.get('/integrations', integrationsAdmin.index);
router.get('/integrations/import', integrationsImportCtrl.form);
router.post('/integrations/import', require('../../../services/upload').importUpload.single('file'), integrationsImportCtrl.run);

router.get('/integrations/status', syncOrdersCtrl.status);
router.post('/integrations/:slug/sync', syncOrdersCtrl.sync);
router.post('/integrations/:slug/sync-stocks', syncOrdersCtrl.syncStocks);
router.post('/integrations/:slug/sync-prices', syncOrdersCtrl.syncPrices);
router.get('/integrations/:slug/test', syncOrdersCtrl.testConnection);

router.get('/integrations/:slug', integrationsAdmin.form);
router.post('/integrations/:slug', integrationsAdmin.save);
router.post('/integrations/:slug/toggle', integrationsAdmin.toggle);
router.get('/integrations/:slug/export/yml', integrationsAdmin.exportYml);
router.get('/integrations/:slug/export/csv', integrationsAdmin.exportCsv);

module.exports = router;
