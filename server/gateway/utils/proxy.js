import { createProxyMiddleware } from "http-proxy-middleware";

export default function proxy(target) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        onProxyReq(proxyReq, req) {
            if (req.user) {
                proxyReq.setHeader(
                    "x-user",
                    JSON.stringify(req.user)
                );
            }
        },
    });
}