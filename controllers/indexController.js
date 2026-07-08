// Index Controller, currently only serves the index. May be removed or altered.
const index = (req, res) => {
  res.render("index", { title: "Index" });
};

export { index };
