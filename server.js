
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());

// Cau hinh URL cua cac service
const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;

// Health check
app.get('/health', async (req, res) => {
    const checkService = async (url) => {
        try {
            await axios.get(`${url}/health`, { timeout: 5000 });
            return { status: 'healthy', url };
        } catch (error) {
            return {
                status: 'unhealthy',
                url,
                error: error.message
            };
        }
    };

    const [userService, productService, orderService] =
        await Promise.all([
            checkService(USER_SERVICE_URL),
            checkService(PRODUCT_SERVICE_URL),
            checkService(ORDER_SERVICE_URL)
        ]);

    const healthy = [
        userService,
        productService,
        orderService
    ].every(service => service.status === 'healthy');

    res.status(healthy ? 200 : 503).json({
        gateway: {
            status: 'healthy',
            timestamp: new Date().toISOString()
        },
        services: { userService, productService, orderService }
    });
});

// Proxy cac request, giu nguyen endpoint
app.use('/users', createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000
}));

app.use('/products', createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000
}));

app.use('/orders', createProxyMiddleware({
    target: ORDER_SERVICE_URL,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000
}));

// Parse JSON sau cac proxy
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'Microservices API Gateway',
        version: '1.0.0',
        endpoints: [
            'GET /users',
            'GET /products',
            'GET /orders',
            'POST /orders',
            'GET /health'
        ]
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
