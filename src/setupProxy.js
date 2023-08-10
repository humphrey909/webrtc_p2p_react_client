const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/socket.io',
        createProxyMiddleware({
            target: 'http://43.201.165.228:3000', // 시그널링 서버의 주소
            ws: true, // WebSocket 지원 여부
        })
    );
};
