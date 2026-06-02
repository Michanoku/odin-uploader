// Check if a user is authorized or not
const isAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        return res.redirect("/login");
    }
}

export {
    isAuth,
}