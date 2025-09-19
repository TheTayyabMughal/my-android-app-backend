const asynchandler = (requesthanlder) => {
    return (req, res, next) => {
        Promise.resolve(requesthanlder(req, res, next)).catch((err) => {
("AsyncHandler caught error:", err);
            // Only call next(err) if headers haven't been sent
            if (!res.headersSent) {
                next(err);
            } else {
("Headers already sent, not calling next(err)");
            }
        });
    }
}
export { asynchandler }