// codewise-frontend/src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // 모든 HTTP API는 /api로 호출 → 백엔드 루트로 넘김
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://54.180.142.101:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // ★ /api를 지워서 백엔드 루트로 전달
      logLevel: 'debug',
    })
  );

  // STOMP/SockJS 엔드포인트 프록시
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://54.180.142.101:8080',
      changeOrigin: true,
      ws: true,
      secure: false,
      logLevel: 'debug',
    })
  );
};
