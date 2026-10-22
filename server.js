const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Environment variables for service URLs
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
    const healthChecks = {
        gateway: {
            status: 'healthy',
            timestamp: new Date().toISOString()
        },
        services: {}
    };

    // Check user service
    try {
        const userHealth = await fetch(`${USER_SERVICE_URL}/health`);

        healthChecks.services.userService = userHealth.ok
            ? { status: 'healthy', url: USER_SERVICE_URL }
            : { status: 'unhealthy', url: USER_SERVICE_URL };
    } catch (error) {
        healthChecks.services.userService = {
            status: 'unhealthy',
            url: USER_SERVICE_URL,
            error: error.message
        };
    }

    // Check product service
    try {
        const productHealth = await fetch(`${PRODUCT_SERVICE_URL}/health`);

        healthChecks.services.productService = productHealth.ok
            ? { status: 'healthy', url: PRODUCT_SERVICE_URL }
            : { status: 'unhealthy', url: PRODUCT_SERVICE_URL };
    } catch (error) {
        healthChecks.services.productService = {
            status: 'unhealthy',
            url: PRODUCT_SERVICE_URL,
            error: error.message
        };
    }

    // Check order service
    try {
        const orderHealth = await fetch(`${ORDER_SERVICE_URL}/health`);

        healthChecks.services.orderService = orderHealth.ok
            ? { status: 'healthy', url: ORDER_SERVICE_URL }
            : { status: 'unhealthy', url: ORDER_SERVICE_URL };
    } catch (error) {
        healthChecks.services.orderService = {
            status: 'unhealthy',
            url: ORDER_SERVICE_URL,
            error: error.message
        };
    }

    res.json(healthChecks);
});

// Proxy configuration with error handling
const createProxyWithErrorHandling = (target, pathRewrite) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite,
        timeout: 10000,

        onError: (err, req, res) => {
            console.error(`Proxy error for ${req.url}:`, err.message);

            res.status(503).json({
                error: 'Service temporarily unavailable',
                service: target,
                timestamp: new Date().toISOString()
            });
        },

        onProxyReq: (proxyReq, req, res) => {
            console.log(
                `Proxying ${req.method} ${req.url} to ${target}`
            );
        }
    });
};

// Create proxy middleware for each service
app.use(
    '/users',
    createProxyWithErrorHandling(USER_SERVICE_URL, {
        '^/users': ''
    })
);

app.use(
    '/products',
    createProxyWithErrorHandling(PRODUCT_SERVICE_URL, {
        '^/products': ''
    })
);

app.use(
    '/orders',
    createProxyWithErrorHandling(ORDER_SERVICE_URL, {
        '^/orders': ''
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