const index = (req, res) => {
  res.render("index", { title: "Express Template" });
};

export { index };
