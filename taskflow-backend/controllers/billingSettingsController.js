const { CompanyBillingSetting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const getCompanyKey = (user) => user.company || 'default';

const getSettingsRecord = async (user) => {
  const company = getCompanyKey(user);
  const [record] = await CompanyBillingSetting.findOrCreate({
    where: { company },
    defaults: { company }
  });
  return record;
};

// @desc    Get company billing assets (logo, signature)
// @route   GET /api/billing-settings
// @access  Private (Finance authorized)
exports.getBillingSettings = asyncHandler(async (req, res, next) => {
  const record = await getSettingsRecord(req.user);
  res.status(200).json({
    success: true,
    data: {
      company: record.company,
      logoUrl: record.logoUrl,
      signatureUrl: record.signatureUrl
    }
  });
});

// @desc    Upload company billing logo
// @route   POST /api/billing-settings/logo
// @access  Private (Finance authorized)
exports.uploadBillingLogo = asyncHandler(async (req, res, next) => {
  const cloudinary = require('../config/cloudinary');
  const fs = require('fs');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an image file' });
  }

  try {
    const record = await getSettingsRecord(req.user);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'taskflow/billing-logos',
      resource_type: 'image'
    });

    record.logoUrl = result.secure_url;
    await record.save();

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({ success: true, logoUrl: record.logoUrl });
  } catch (uploadErr) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, error: 'Cloudinary upload failed: ' + uploadErr.message });
  }
});

// @desc    Remove company billing logo (reset to default)
// @route   DELETE /api/billing-settings/logo
// @access  Private (Finance authorized)
exports.removeBillingLogo = asyncHandler(async (req, res, next) => {
  const record = await getSettingsRecord(req.user);
  record.logoUrl = null;
  await record.save();
  res.status(200).json({ success: true, logoUrl: null });
});

// @desc    Upload company billing signature
// @route   POST /api/billing-settings/signature
// @access  Private (Finance authorized)
exports.uploadBillingSignature = asyncHandler(async (req, res, next) => {
  const cloudinary = require('../config/cloudinary');
  const fs = require('fs');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an image file' });
  }

  try {
    const record = await getSettingsRecord(req.user);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'taskflow/billing-signatures',
      resource_type: 'image'
    });

    record.signatureUrl = result.secure_url;
    await record.save();

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({ success: true, signatureUrl: record.signatureUrl });
  } catch (uploadErr) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, error: 'Cloudinary upload failed: ' + uploadErr.message });
  }
});

// @desc    Remove company billing signature (reset to default)
// @route   DELETE /api/billing-settings/signature
// @access  Private (Finance authorized)
exports.removeBillingSignature = asyncHandler(async (req, res, next) => {
  const record = await getSettingsRecord(req.user);
  record.signatureUrl = null;
  await record.save();
  res.status(200).json({ success: true, signatureUrl: null });
});