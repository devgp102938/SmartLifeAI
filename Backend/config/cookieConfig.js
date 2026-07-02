const cookieOptions = {
    httpOnly : true,
    secure : false,
    sameSite : "lax",
    maxAge : 24 * 60 * 60 * 1000,
    path : "/"
}

module.exports = cookieOptions;