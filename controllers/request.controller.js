const Request = require("#models/request.model");
const Site = require("#models/site.model");
const User = require("#models/user.model");
const asyncHandler = require("#utils/async-handler");
const {
  clientChangeRequestEmail
} = require("#utils/email templates/change-request");

const {taskCompletedEmail} = require("#utils/email templates/task-complete-email")
const { getResend } = require("#utils/resend");
const streamifier = require("streamifier");
const cloudinary = require("#config/cloudinary");

/* ─── HELPER: upload buffer → Cloudinary ─────────────────────────────────── */
const uploadToCloudinary = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "SproutoGo", resource_type: "auto" },
      (error, result) => (result ? resolve(result) : reject(error)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * @desc Get requests (Admin: all, Developer: assigned, Client: by site)
 * @route GET /api/requests
 */

exports.getRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let { siteId } = req.query;

  // sanitize siteId
  if (siteId === "null" || siteId === "" || siteId === undefined) {
    siteId = null;
  }

  let filter = {};

  // Admin / Superadmin = all requests
  if (userRole === "admin" || userRole === "superadmin") {
    filter = {};
  }

  // Developer = assigned requests
  else if (userRole === "developer") {
    filter = { assignedTo: userId };
  }

  // Normal User
  else {
    if (siteId) {
      // validate site belongs to user
      const site = await Site.findOne({ _id: siteId, userId });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Site not found",
        });
      }

      filter = { siteId, userId };
    } else {
      // no siteId = all user's requests
      filter = { userId };
    }
  }

  const requests = await Request.find(filter)
    .populate("siteId", "name url")
    .populate("userId", "firstname surname email")
    .populate("assignedTo", "firstname surname email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: requests,
  });
});

/**
 * @desc Create new request (with optional file attachment)
 * @route POST /api/requests
 */

exports.createRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  let { siteId, title, description, priority } = req.body;

  if (siteId === "null" || siteId === "" || siteId === undefined) {
  siteId = null;
 }

  if (!title || !description || !priority) {
    return res.status(400).json({
      success: false,
      message: "Title, description and priority are required",
    });
  }

  // Get user first
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // ✅ Only find site if siteId exists
  let site = null;

  if (siteId) {
    site = await Site.findOne({ _id: siteId, userId });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }
  }

  // Upload attachment
  let attachments = [];

  if (req.file) {
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype
    );

    attachments = [
      {
        url: result.secure_url,
        public_id: result.public_id,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    ];
  }

  // ✅ Create request
  const request = await Request.create({
    siteId: site ? site._id : null,
    userId,
    title,
    description,
    priority,
    status: "pending",
    attachments,
  });

  // Email
  const resend = getResend();

  if (resend && process.env.RESEND_FROM_EMAIL) {
    try {
      const html = clientChangeRequestEmail({
        username: user.firstname || "User",
        siteName: site ? site.name : "No Site Selected",
        siteUrl: site ? site.url : "#",
        requestDetails: `
          ${
            site
              ? `
            <b>Site:</b> ${site.name}<br/>
            <b>URL:</b> <a href="${site.url}" target="_blank">${site.url}</a><br/><br/>
          `
              : ""
          }

          <b>Title:</b> ${title}<br/>
          <b>Priority:</b> ${priority}<br/><br/>
          ${description}

          ${
            attachments.length
              ? `<br/><br/><b>Attachment:</b> 
                 <a href="${attachments[0].url}">
                 ${attachments[0].original_name}
                 </a>`
              : ""
          }
        `,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: `New Change Request ${
          site ? "- " + site.name : ""
        }`,
        html,
      });
    } catch (err) {
      console.error("Change request email failed:", err.message);
    }
  }

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
  if (!request)
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });

  const site = await Site.findOne({ _id: request.siteId, userId });
  if (!site)
    return res.status(403).json({ success: false, message: "Unauthorized" });

  ["title", "description", "priority"].forEach((field) => {
    if (req.body[field] !== undefined) request[field] = req.body[field];
  });

  await request.save();
  res.json({ success: true, data: request });
});

/**
 * @desc Assign developer to request (ADMIN ONLY)
 * @route PATCH /api/requests/:id/assign
 */
exports.assignRequest = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const { id } = req.params;
  const { developerId } = req.body;

  if (userRole !== "admin" && userRole !== "superadmin") {
    return res
      .status(403)
      .json({ success: false, message: "Only admin can assign requests" });
  }

  if (!developerId) {
    return res
      .status(400)
      .json({ success: false, message: "developerId is required" });
  }

  const request = await Request.findById(id);
  if (!request)
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });

  const developer = await User.findById(developerId);
  if (!developer || developer.role !== "developer") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid developer" });
  }

  request.assignedTo = developerId;
  request.status = "in-progress";
  await request.save();

  const updated = await Request.findById(id).populate(
    "assignedTo",
    "firstname surname email",
  );
  res.json({ success: true, data: updated });
});

/**
 * @desc Delete request
 * @route DELETE /api/requests/:id
 */
exports.deleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const request = await Request.findById(id);
  if (!request)
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });

  const site = await Site.findOne({ _id: request.siteId, userId });
  if (!site)
    return res.status(403).json({ success: false, message: "Unauthorized" });

  await request.deleteOne();
  res.json({ success: true, message: "Request deleted successfully" });
});



exports.completeRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  // Update request status
  const request = await Request.findByIdAndUpdate(
    requestId,
    { status: "completed" },
    { new: true }
  ).populate("userId", "firstname surname email");

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Request not found",
    });
  }

  // Get related site
  let site = null;

  if (request.siteId) {
    site = await Site.findById(request.siteId);
  }

  // Send completion email using Resend
  const resend = getResend();

  if (resend && process.env.RESEND_FROM_EMAIL) {
    try {
      const client = request.userId;

      const html = taskCompletedEmail({
        clientName: `${client.firstname} ${client.surname}`,
        siteName: site ? site.name : "your site",
        requestTitle: request.title,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: client.email,
        subject: "Your request has been completed ✅",
        html,
      });
    } catch (err) {
      console.error("Completion email failed:", err.message);
    }
  }

  res.status(200).json({
    success: true,
    data: request,
  });
});