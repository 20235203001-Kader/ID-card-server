const Application = require('../models/Application');
const Student = require('../models/Student');

exports.getDashboardData = async (req, res) => {
  try {
    const pendingApplications = await Application.find({ status: 'pending' })
      .populate('studentId', 'name studentId email');
      
    const recentApproved = await Application.find({ status: 'approved' })
      .sort({ approvedAt: -1 })
      .limit(5)
      .populate('studentId', 'name studentId');
      
    res.json({ pendingApplications, recentApproved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processApplication = async (req, res) => {
  try {
    const { applicationId, action, rejectionReason } = req.body;
    const application = await Application.findById(applicationId);
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    
    if (action === 'approve') {
      application.status = 'approved';
      application.approvedAt = new Date();
      application.processedBy = req.adminId;
      application.estimatedReadyDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      await application.save();
      
      // Here you might want to notify the student via email or other means
    } else if (action === 'reject') {
      application.status = 'rejected';
      application.processedBy = req.adminId;
      application.rejectionReason = rejectionReason;
      await application.save();
      
      // Notify student about rejection
    }
    
    res.json({ message: `Application ${action}d successfully`, application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};