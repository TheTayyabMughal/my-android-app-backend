const asynchandler = (requesthanlder) => {
    return (req, res, next) => {
        Promise.resolve(requesthanlder(req, res, next)).catch((err) => {
            console.error("AsyncHandler caught error:", err);
            // Only call next(err) if headers haven't been sent
            if (!res.headersSent) {
                next(err);
            } else {
                console.log("Headers already sent, not calling next(err)");
            }
        });
    }
}
export { asynchandler }