import express from 'express';

const router = express.Router();

// GET /api/version/check
router.get('/check', (req, res) => {
  try {
    const minVersionCode = parseInt(process.env.MIN_APP_VERSION_CODE || '1', 10);
    const latestVersionCode = parseInt(process.env.LATEST_APP_VERSION_CODE || '1', 10);
    const minVersionName = process.env.MIN_APP_VERSION_NAME || '1.0.0';
    const latestVersionName = process.env.LATEST_APP_VERSION_NAME || '1.0.0';
    const forceUpdate = process.env.FORCE_UPDATE === 'true';
    const downloadUrl = process.env.APP_DOWNLOAD_URL || 'https://example.com/download/sportsnplay-latest.apk';
    const updateTitle = process.env.UPDATE_TITLE || 'Time for an Update!';
    const updateMessage = process.env.UPDATE_MESSAGE || 'A new version of SportsNPlay is available. Please update to continue using the app.';
    
    // Parse release notes from comma-separated env var or default list
    const rawReleaseNotes = process.env.UPDATE_RELEASE_NOTES || 
      '🚀 Enhanced Performance: Smoother ground bookings & real-time chat, 🛡️ Security & Stability: Important infrastructure upgrades';
    
    const releaseNotes = rawReleaseNotes
      .split(',')
      .map(note => note.trim())
      .filter(Boolean);

    res.json({
      success: true,
      minVersionCode,
      latestVersionCode,
      minVersionName,
      latestVersionName,
      forceUpdate,
      downloadUrl,
      updateTitle,
      updateMessage,
      releaseNotes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch version check info',
      error: error.message
    });
  }
});

export default router;
