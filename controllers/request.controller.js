const Request = require("#models/request.model");
const Site = require("#models/site.model");
const User = require("#models/user.model"); 
const asyncHandler = require("#utils/async-handler");
const {clientChangeRequestEmail} = require("#utils/email templates/change-request");
const { getResend } = require("#utils/resend");

/**
 * @desc Get requests (Admin: all, Client: by site)
 * @route GET /api/requests
 */

exports.getRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { siteId } = req.query;

  let filter = {};

  // 🟣 ADMIN / SUPERADMIN → ALL requests
  if (userRole === "admin" || userRole === "superadmin") {
    filter = {};
  }

  // 🟡 DEVELOPER → ONLY assigned requests
  else if (userRole === "developer") {
    filter = { assignedTo: userId };
  }

  // 🔵 CLIENT → MUST provide siteId
  else {
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: "siteId is required",
      });
    }

    const site = await Site.findOne({ _id: siteId, userId });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    filter = { siteId };
  }

  const requests = await Request.find(filter)
    .populate("siteId", "name url")
    .populate("userId", "name email")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: requests,
  });
});
/**
 * @desc Create new request
 * @route POST /api/requests
 */

// exports.createRequest = asyncHandler(async (req, res) => {
//   const userId = req.user.id;
//   const { siteId, title, description, priority } = req.body;

//   if (!siteId || !title || !description || !priority) {
//     return res.status(400).json({
//       success: false,
//       message: "All fields are required",
//     });
//   }

//   const site = await Site.findOne({ _id: siteId, userId });

//   if (!site) {
//     return res.status(404).json({
//       success: false,
//       message: "Site not found",
//     });
//   }

//   const request = await Request.create({
//     siteId,
//     userId,
//     title,
//     description,
//     priority,
//     status: "pending",
//   });

//   res.status(201).json({
//     success: true,
//     data: request,
//   });
// });



exports.createRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { siteId, title, description, priority } = req.body;

  if (!siteId || !title || !description || !priority) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const site = await Site.findOne({ _id: siteId, userId });

  if (!site) {
    return res.status(404).json({
      success: false,
      message: "Site not found",
    });
  }

  // 1. Create request
  const request = await Request.create({
    siteId,
    userId,
    title,
    description,
    priority,
    status: "pending",
  });

  // 2. Send email to admin
  const resend = getResend();

  if (resend && process.env.RESEND_FROM_EMAIL) {
    try {
      const html = clientChangeRequestEmail({
        username: user.firstname || "User",
        siteName: site.name,
        requestDetails: `
          <b>Title:</b> ${title}<br/>
          <b>Priority:</b> ${priority}<br/><br/>
          ${description}
        `,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.ADMIN_EMAIL, 
        subject: `New Change Request - ${site.name}`,
        html,
      });
    } catch (err) {
      console.error("Change request email failed:", {
        message: err.message,
        stack: err.stack,
      });
    }
  }

  // 3. Response
  res.status(201).json({
    success: true,
    data: request,
  });
});

/**
 * @desc Update request (client edits only)
 * @route PATCH /api/requests/:id
 */
exports.updateRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const request = await Request.findById(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  const site = await Site.findOne({
    _id: request.siteId,
    userId,
  });

  if (!site) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const allowedUpdates = ["title", "description", "priority"];
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      request[field] = req.body[field];
    }
  });

  await request.save();

  res.json({
    success: true,
    data: request,
  });
});

/**
 * @desc Assign developer to request (ADMIN ONLY)
 * @route PATCH /api/requests/:id/assign
 */
exports.assignRequest = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const { id } = req.params;
  const { developerId } = req.body;

  // 🔒 Only admin allowed
  if (userRole !== "admin" && userRole !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Only admin can assign requests",
    });
  }

  if (!developerId) {
    return res.status(400).json({
      success: false,
      message: "developerId is required",
    });
  }

  const request = await Request.findById(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  // ✅ Validate developer
  const developer = await User.findById(developerId);

  if (!developer || developer.role !== "developer") {
    return res.status(400).json({
      success: false,
      message: "Invalid developer",
    });
  }

  request.assignedTo = developerId;
  request.status = "in-progress"; // 🔥 auto move status

  await request.save();

  const updated = await Request.findById(id)
    .populate("assignedTo", "name email");

  res.json({
    success: true,
    data: updated,
  });
});

/**
 * @desc Delete request
 * @route DELETE /api/requests/:id
 */
exports.deleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const request = await Request.findById(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  const site = await Site.findOne({
    _id: request.siteId,
    userId,
  });

  if (!site) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  await request.deleteOne();

  res.json({
    success: true,
    message: "Request deleted successfully",
  });
});