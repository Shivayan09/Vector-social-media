// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function (err, req, res, next) {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Gateway Error",
    });
}