// codewise-frontend/src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = 'http://54.180.142.101:8080'; // 백엔드 주소

module.exports = function (app) {
  // REST
  app.use(
    '/api',
    createProxyMiddleware({
      target: BACKEND,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
      logLevel: 'debug',
    })
  );

  // STOMP/SockJS /stomp 로 받고 → 백엔드의 /ws 로
  app.use(
    '/stomp',
    createProxyMiddleware({
      target: BACKEND,
      changeOrigin: true,
      ws: true,
      secure: false,
      pathRewrite: { '^/stomp': '/ws' },
      logLevel: 'debug',
    })
  );

};
