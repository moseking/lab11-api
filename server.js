
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Cau hinh URL cua cac service
const USER_SERVICE_URL =
    process.env.USER_SERVICE_URL || 'http://localhost:3001';

const PRODUCT_SERVICE_URL =
    process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

const ORDER_SERVICE_URL =
    process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

console.log('Service URLs:');
console.log('User Service:', USER_SERVICE_URL);
console.log('Product Service:', PRODUCT_SERVICE_URL);
console.log('Order Service:', ORDER_SERVICE_URL);

// Health check endpoint
app.get('/health', async (req, res) => {
    const checkService = async (url) => {
        try {
            await axios.get(`${url}/health`, {
                timeout: 5000
            });

            return {
                status: 'healthy',
                url
            };
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

    const allHealthy = [
        userService,
        productService,
        orderService
    ].every(service => service.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
        gateway: {
            status: 'healthy',
            timestamp: new Date().toISOString()
        },
        services: {
            userService,
            productService,
            orderService
        }
    });
});


 // Proxy configuration with error handling
const createProxyWithErrorHandling = (target, prefix) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,

        // Khoi phuc prefix bi Express loai bo khi mount middleware
        pathRewrite: (path, req) => {
            const rewrittenPath = prefix + path;
            console.log(
                `Rewriting ${path} -> ${rewrittenPath}`
            );
            return rewrittenPath;
        },

        timeout: 30000,
        proxyTimeout: 30000,

        onError: (err, req, res) => {
            console.error(
                `Proxy error for ${req.method} ${req.originalUrl}:`,
                err.message
            );

            if (!res.headersSent) {
                res.status(503).json({
                    error: 'Service temporarily unavailable',
                    service: target,
                    timestamp: new Date().toISOString()
                });
            }
        },

        onProxyReq: (proxyReq, req, res) => {
            console.log(
                `Proxying ${req.method} ${req.originalUrl} -> ${target}${proxyReq.path}`
            );
        }
    });
};

// Proxy cac request den dung endpoint cua service

app.use(
    '/users',
    createProxyMiddleware({
        target: USER_SERVICE_URL,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000
    })
);

app.use(
    '/products',
    createProxyMiddleware({
        target: PRODUCT_SERVICE_URL,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000
    })
);

app.use(
    '/orders',
    createProxyMiddleware({
        target: ORDER_SERVICE_URL,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000
    })
);


// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Microservices API Gateway',
        version: '1.0.0',
        services: {
            userService: USER_SERVICE_URL,
            productService: PRODUCT_SERVICE_URL,
            orderService: ORDER_SERVICE_URL
        },
        endpoints: [
            'GET /users - Get all users',
            'POST /users - Create user',
            'GET /products - Get all products',
            'POST /products - Create product',
            'GET /orders - Get all orders',
            'POST /orders - Create order',
            'GET /health - Health check all services'
        ],
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
