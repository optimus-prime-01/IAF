const fs = require("fs");
const path = require("path");
const { convert } = require("pdf-poppler");
const Pdf = require("../models/Pdf");

const uploadPdfMetadata = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!title || !content || !category || !pdfFile) {
      return res.status(400).json({ msg: "Missing required fields." });
    }

    const folderName = req.folderName; // set by multer
    const uploadDir = path.join(__dirname, "../uploads", folderName);
    let thumbnailPath;

    if (thumbnailFile) {
      thumbnailPath = `/uploads/${folderName}/${thumbnailFile.filename}`;
    } else {
      const inputPath = pdfFile.path;
      const timestamp = Date.now();
      const outputPrefix = `thumb_${timestamp}`;

      console.log("📦 Converting PDF to thumbnail...");

      await convert(inputPath, {
        format: "png",
        out_dir: uploadDir,
        out_prefix: outputPrefix,
        page: 1,
      });

      const base1 = path.join(uploadDir, `${outputPrefix}-1.png`);
      const base01 = path.join(uploadDir, `${outputPrefix}-01.png`);

      if (fs.existsSync(base1)) {
        thumbnailPath = `/uploads/${folderName}/${path.basename(base1)}`;
      } else if (fs.existsSync(base01)) {
        thumbnailPath = `/uploads/${folderName}/${path.basename(base01)}`;
      } else {
        console.error("❌ Thumbnail file not found.");
        return res.status(500).json({ msg: "Thumbnail generation failed." });
      }

      console.log("✅ Thumbnail saved at:", thumbnailPath);
    }

    const newPdf = new Pdf({
      title,
      content,
      category,
      pdf: `/uploads/${folderName}/${pdfFile.filename}`,
      thumbnail: thumbnailPath,
    });

    await newPdf.save();

    res.status(200).json({
      msg: "✅ Uploaded successfully",
      pdfPath: `/uploads/${folderName}/${pdfFile.filename}`,
      thumbnailPath: thumbnailPath,
    });
  } catch (error) {
    console.error("❌ Error in uploadPdfMetadata:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { uploadPdfMetadata };
