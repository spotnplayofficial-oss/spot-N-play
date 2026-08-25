import express from 'express';
import {
  getPublicSettings,
  getPublicFaqs,
  getPublicCareers,
  getPublicLiveStreams,
  submitCareerApplication,
  submitCollaboration,
} from '../controllers/siteController.js';

const router = express.Router();

router.get('/settings', getPublicSettings);
router.get('/live', getPublicLiveStreams);
router.get('/faqs', getPublicFaqs);
router.get('/careers', getPublicCareers);
router.post('/careers/:id/apply', submitCareerApplication);
router.post('/careers/apply', submitCareerApplication);
router.post('/collaborate', submitCollaboration);

export default router;
