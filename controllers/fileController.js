const getUpload = (req, res) => {
  res.render("upload", { title: "Upload" });
};

const postUpload = (req, res) => {
  console.log(req.file);
  res.redirect("/upload");
};

export { getUpload, postUpload };
